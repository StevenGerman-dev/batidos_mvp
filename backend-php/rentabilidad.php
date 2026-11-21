<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

configurarCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$conexion = conectarBaseDatos();

$condiciones = [];
$parametros = [];

$desde = isset($_GET['desde']) ? trim((string) $_GET['desde']) : '';
$hasta = isset($_GET['hasta']) ? trim((string) $_GET['hasta']) : '';
$producto = isset($_GET['producto']) ? trim((string) $_GET['producto']) : '';

if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) {
    $condiciones[] = 'DATE(fecha) >= ?';
    $parametros[] = $desde;
}

if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) {
    $condiciones[] = 'DATE(fecha) <= ?';
    $parametros[] = $hasta;
}

if ($producto !== '') {
    $condiciones[] = 'producto LIKE ?';
    $parametros[] = '%' . $producto . '%';
}

$sql = 'SELECT venta_id, fecha, producto, cantidad, total_cobrado, costo_total,
               ganancia, margen_porcentaje, ganancia_por_unidad
        FROM vw_rentabilidad_ventas';

if ($condiciones !== []) {
    $sql .= ' WHERE ' . implode(' AND ', $condiciones);
}

$sql .= ' ORDER BY fecha DESC, venta_id DESC';

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
        'mensaje' => 'No se pudo calcular la rentabilidad.',
        'detalle' => $error->getMessage(),
    ]);
}

$ventas = [];
$totalCobrado = 0.0;
$totalCosto = 0.0;
$gananciaTotal = 0.0;
$productoMasRentable = null;
$mayorGanancia = null;

while ($fila = $resultado->fetch_assoc()) {
    $venta = [
        'venta_id' => (int) $fila['venta_id'],
        'fecha' => $fila['fecha'],
        'producto' => $fila['producto'],
        'cantidad' => (int) $fila['cantidad'],
        'total_cobrado' => (float) $fila['total_cobrado'],
        'costo_total' => (float) $fila['costo_total'],
        'ganancia' => (float) $fila['ganancia'],
        'margen_porcentaje' => (float) $fila['margen_porcentaje'],
        'ganancia_por_unidad' => (float) $fila['ganancia_por_unidad'],
    ];

    $ventas[] = $venta;
    $totalCobrado += $venta['total_cobrado'];
    $totalCosto += $venta['costo_total'];
    $gananciaTotal += $venta['ganancia'];

    if ($mayorGanancia === null || $venta['ganancia'] > $mayorGanancia) {
        $mayorGanancia = $venta['ganancia'];
        $productoMasRentable = $venta['producto'];
    }
}

$resumen = [
    'total_ventas' => count($ventas),
    'total_cobrado' => round($totalCobrado, 2),
    'total_costo' => round($totalCosto, 2),
    'ganancia_total' => round($gananciaTotal, 2),
    'margen_global' => $totalCobrado > 0 ? round(($gananciaTotal / $totalCobrado) * 100, 2) : 0.0,
    'producto_mas_rentable' => $productoMasRentable,
];

responder(200, [
    'ok' => true,
    'resumen' => $resumen,
    'ventas' => $ventas,
]);
