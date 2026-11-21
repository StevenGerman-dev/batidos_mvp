<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

configurarCors();

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$conexion = conectarBaseDatos();

if ($metodo === 'GET') {
    $condiciones = [];
    $parametros = [];

    $insumoId = isset($_GET['insumo_id']) && is_numeric($_GET['insumo_id'])
        ? (int) $_GET['insumo_id']
        : null;
    $desde = isset($_GET['desde']) ? trim((string) $_GET['desde']) : '';
    $hasta = isset($_GET['hasta']) ? trim((string) $_GET['hasta']) : '';

    if ($insumoId !== null && $insumoId > 0) {
        $condiciones[] = 'insumo_id = ?';
        $parametros[] = $insumoId;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) {
        $condiciones[] = 'DATE(fecha) >= ?';
        $parametros[] = $desde;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) {
        $condiciones[] = 'DATE(fecha) <= ?';
        $parametros[] = $hasta;
    }

    $sql = 'SELECT id, fecha, tipo, cantidad, signo, motivo, observaciones,
                   stock_anterior, stock_nuevo, insumo_id, insumo, unidad_medida, usuario
            FROM vw_mermas_detalle';

    if ($condiciones !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $condiciones);
    }

    $sql .= ' ORDER BY fecha DESC, id DESC';

    try {
        $sentencia = $conexion->prepare($sql);

        if ($parametros !== []) {
            $sentencia->bind_param(str_repeat('s', count($parametros)), ...$parametros);
        }

        $sentencia->execute();
        $resultado = $sentencia->get_result();
    } catch (Throwable $error) {
        responder(500, [
            'ok' => false,
            'mensaje' => 'No se pudo listar las mermas.',
            'detalle' => $error->getMessage(),
        ]);
    }

    $mermas = [];
    while ($fila = $resultado->fetch_assoc()) {
        $mermas[] = [
            'id' => (int) $fila['id'],
            'fecha' => $fila['fecha'],
            'tipo' => $fila['tipo'],
            'cantidad' => (float) $fila['cantidad'],
            'signo' => (int) $fila['signo'],
            'motivo' => $fila['motivo'],
            'observaciones' => $fila['observaciones'],
            'stock_anterior' => (float) $fila['stock_anterior'],
            'stock_nuevo' => (float) $fila['stock_nuevo'],
            'insumo_id' => (int) $fila['insumo_id'],
            'insumo' => $fila['insumo'],
            'unidad_medida' => $fila['unidad_medida'],
            'usuario' => $fila['usuario'],
        ];
    }

    responder(200, ['ok' => true, 'mermas' => $mermas]);
}

if ($metodo !== 'POST') {
    responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$datos = leerCuerpo();

$insumoId = (int) numero($datos, 'insumo_id');
$tipo = strtoupper(texto($datos, 'tipo', 'MERMA'));
$cantidad = numero($datos, 'cantidad');
$motivo = texto($datos, 'motivo');
$observaciones = texto($datos, 'observaciones');
$fecha = texto($datos, 'fecha', date('Y-m-d H:i:s'));
$usuarioId = enteroOpcional($datos, 'usuario_id');

$errores = [];

if ($insumoId <= 0) {
    $errores[] = 'Selecciona un insumo válido.';
}

if (!in_array($tipo, ['MERMA', 'AJUSTE'], true)) {
    $errores[] = 'El tipo debe ser MERMA o AJUSTE.';
}

if ($cantidad <= 0) {
    $errores[] = 'La cantidad debe ser mayor a 0.';
}

if (mb_strlen($motivo) < 3 || mb_strlen($motivo) > 100) {
    $errores[] = 'El motivo debe tener entre 3 y 100 caracteres.';
}

if ($fecha === '' || !preg_match('/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/', $fecha)) {
    $errores[] = 'La fecha no tiene un formato válido.';
}

if ($errores !== []) {
    responder(422, ['ok' => false, 'mensaje' => 'Revisa los datos de la merma.', 'errores' => $errores]);
}

$signo = $tipo === 'MERMA' ? -1 : 1;
$fechaNormalizada = normalizarFecha($fecha);

$conexion->begin_transaction();

try {
    $consultarInsumo = $conexion->prepare(
        'SELECT id, nombre, stock_actual, unidad_medida FROM insumos WHERE id = ? FOR UPDATE'
    );
    $consultarInsumo->bind_param('i', $insumoId);
    $consultarInsumo->execute();
    $insumo = $consultarInsumo->get_result()->fetch_assoc();

    if (!$insumo) {
        throw new RuntimeException('El insumo seleccionado no existe.');
    }

    $stockAnterior = (float) $insumo['stock_actual'];
    $delta = $signo * $cantidad;
    $stockNuevo = round($stockAnterior + $delta, 2);

    if ($stockNuevo < 0) {
        throw new RuntimeException(
            "Stock insuficiente para {$insumo['nombre']}. Disponible: {$stockAnterior} {$insumo['unidad_medida']}."
        );
    }

    $actualizarStock = $conexion->prepare('UPDATE insumos SET stock_actual = ? WHERE id = ?');
    $actualizarStock->bind_param('di', $stockNuevo, $insumoId);
    $actualizarStock->execute();

    $insertarMerma = $conexion->prepare(
        'INSERT INTO mermas
            (insumo_id, tipo, cantidad, signo, motivo, observaciones, stock_anterior, stock_nuevo, fecha, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insertarMerma->bind_param(
        'isdissddss',
        $insumoId,
        $tipo,
        $cantidad,
        $signo,
        $motivo,
        $observaciones,
        $stockAnterior,
        $stockNuevo,
        $fechaNormalizada,
        $usuarioId
    );
    $insertarMerma->execute();
    $mermaId = (int) $conexion->insert_id;

    $conexion->commit();

    responder(201, [
        'ok' => true,
        'merma' => [
            'id' => $mermaId,
            'fecha' => $fechaNormalizada,
            'tipo' => $tipo,
            'cantidad' => $cantidad,
            'signo' => $signo,
            'motivo' => $motivo,
            'observaciones' => $observaciones,
            'stock_anterior' => $stockAnterior,
            'stock_nuevo' => $stockNuevo,
            'insumo_id' => $insumoId,
            'insumo' => $insumo['nombre'],
            'unidad_medida' => $insumo['unidad_medida'],
            'usuario_id' => $usuarioId,
        ],
    ]);
} catch (Throwable $error) {
    $conexion->rollback();
    responder(500, [
        'ok' => false,
        'mensaje' => 'No se pudo registrar la merma: ' . $error->getMessage(),
    ]);
}
