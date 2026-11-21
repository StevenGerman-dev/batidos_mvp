<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

configurarCors();

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$conexion = conectarBaseDatos();

if ($metodo === 'GET') {
    $resultado = $conexion->query(
        "SELECT v.id, v.fecha, v.producto, v.cantidad, v.total, v.usuario_id,
                COALESCE(SUM(dv.cantidad_usada * COALESCE(NULLIF(dv.costo_unitario, 0.00), i.costo_unitario)), 0.00) AS costo_total
         FROM ventas v
         LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
         LEFT JOIN insumos i ON i.id = dv.insumo_id
         GROUP BY v.id, v.fecha, v.producto, v.cantidad, v.total, v.usuario_id
         ORDER BY v.fecha DESC, v.id DESC"
    );

    $ventas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $costo = (float) $fila['costo_total'];
        $total = (float) $fila['total'];
        $ventas[] = [
            'id' => (int) $fila['id'],
            'fecha' => $fila['fecha'],
            'producto' => $fila['producto'],
            'cantidad' => (int) $fila['cantidad'],
            'total' => $total,
            'costo_total' => $costo,
            'ganancia' => round($total - $costo, 2),
            'margen_porcentaje' => $total > 0 ? round((($total - $costo) / $total) * 100, 2) : 0.0,
            'usuario_id' => $fila['usuario_id'] === null ? null : (int) $fila['usuario_id'],
        ];
    }

    responder(200, ['ok' => true, 'ventas' => $ventas]);
}

if ($metodo !== 'POST') {
    responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$datos = leerCuerpo();

$producto = texto($datos, 'producto');
$cantidad = (int) numero($datos, 'cantidad');
$total = numero($datos, 'total');
$fecha = texto($datos, 'fecha', date('Y-m-d H:i:s'));
$usuarioId = enteroOpcional($datos, 'usuario_id');
$detalleSolicitado = $datos['insumos'] ?? [];

$errores = [];

if (mb_strlen($producto) < 2) {
    $errores[] = 'El producto debe tener al menos 2 caracteres.';
}

if ($cantidad <= 0) {
    $errores[] = 'La cantidad debe ser un entero mayor a 0.';
}

if ($total < 0) {
    $errores[] = 'El total no puede ser negativo.';
}

if ($fecha === '' || !preg_match('/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/', $fecha)) {
    $errores[] = 'La fecha no tiene un formato válido.';
}

if (!is_array($detalleSolicitado) || $detalleSolicitado === []) {
    $errores[] = 'La venta debe indicar al menos un insumo para calcular su costo.';
}

$detalleDepurado = [];

if (is_array($detalleSolicitado)) {
    foreach ($detalleSolicitado as $item) {
        if (!is_array($item)) {
            $errores[] = 'Cada insumo debe ser un objeto válido.';
            continue;
        }

        $insumoId = (int) numero($item, 'insumo_id');
        $cantidadUsada = numero($item, 'cantidad_usada');

        if ($insumoId <= 0 || $cantidadUsada <= 0) {
            $errores[] = 'Cada insumo requiere un id válido y una cantidad mayor a 0.';
            continue;
        }

        $detalleDepurado[] = ['insumo_id' => $insumoId, 'cantidad_usada' => $cantidadUsada];
    }
}

if ($errores !== []) {
    responder(422, ['ok' => false, 'mensaje' => 'Revisa los datos de la venta.', 'errores' => $errores]);
}

$conexion->begin_transaction();

try {
    $insertarVenta = $conexion->prepare(
        'INSERT INTO ventas (fecha, producto, cantidad, total, usuario_id) VALUES (?, ?, ?, ?, ?)'
    );
    $fechaNormalizada = normalizarFecha($fecha);
    $insertarVenta->bind_param('ssids', $fechaNormalizada, $producto, $cantidad, $total, $usuarioId);
    $insertarVenta->execute();
    $ventaId = (int) $conexion->insert_id;

    $consultarInsumo = $conexion->prepare(
        'SELECT id, nombre, stock_actual, costo_unitario FROM insumos WHERE id = ? FOR UPDATE'
    );
    $descontarStock = $conexion->prepare(
        'UPDATE insumos SET stock_actual = stock_actual - ? WHERE id = ?'
    );
    $insertarDetalle = $conexion->prepare(
        'INSERT INTO detalle_ventas (venta_id, insumo_id, cantidad_usada, costo_unitario) VALUES (?, ?, ?, ?)'
    );

    $costoTotal = 0.0;
    $detalleGuardado = [];

    foreach ($detalleDepurado as $item) {
        $insumoId = $item['insumo_id'];
        $cantidadUsada = $item['cantidad_usada'];

        $consultarInsumo->bind_param('i', $insumoId);
        $consultarInsumo->execute();
        $insumo = $consultarInsumo->get_result()->fetch_assoc();

        if (!$insumo) {
            throw new RuntimeException("El insumo con id {$insumoId} no existe.");
        }

        $stockActual = (float) $insumo['stock_actual'];

        if ($stockActual < $cantidadUsada) {
            throw new RuntimeException(
                "Stock insuficiente para {$insumo['nombre']}. Disponible: {$stockActual} {$insumo['unidad_medida']}."
            );
        }

        $costoUnitario = (float) $insumo['costo_unitario'];
        $costoTotal += $cantidadUsada * $costoUnitario;

        $descontarStock->bind_param('di', $cantidadUsada, $insumoId);
        $descontarStock->execute();

        $insertarDetalle->bind_param('iidd', $ventaId, $insumoId, $cantidadUsada, $costoUnitario);
        $insertarDetalle->execute();

        $detalleGuardado[] = [
            'insumo_id' => $insumoId,
            'nombre' => $insumo['nombre'],
            'cantidad_usada' => $cantidadUsada,
            'costo_unitario' => $costoUnitario,
        ];
    }

    $conexion->commit();

    $costoTotal = round($costoTotal, 2);
    $ganancia = round($total - $costoTotal, 2);

    responder(201, [
        'ok' => true,
        'venta' => [
            'id' => $ventaId,
            'fecha' => $fechaNormalizada,
            'producto' => $producto,
            'cantidad' => $cantidad,
            'total' => $total,
            'costo_total' => $costoTotal,
            'ganancia' => $ganancia,
            'margen_porcentaje' => $total > 0 ? round(($ganancia / $total) * 100, 2) : 0.0,
            'usuario_id' => $usuarioId,
            'insumos' => $detalleGuardado,
        ],
    ]);
} catch (Throwable $error) {
    $conexion->rollback();
    responder(500, [
        'ok' => false,
        'mensaje' => 'No se pudo registrar la venta: ' . $error->getMessage(),
    ]);
}
