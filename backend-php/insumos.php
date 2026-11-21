<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

configurarCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    responder(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$conexion = conectarBaseDatos();

$resultado = $conexion->query(
    "SELECT id, nombre, stock_actual, unidad_medida, costo_unitario, stock_minimo,
            CASE WHEN stock_actual <= stock_minimo THEN 1 ELSE 0 END AS alerta_stock
     FROM insumos
     ORDER BY nombre ASC"
);

$insumos = [];
while ($fila = $resultado->fetch_assoc()) {
    $insumos[] = [
        'id' => (int) $fila['id'],
        'nombre' => $fila['nombre'],
        'stock_actual' => (float) $fila['stock_actual'],
        'unidad_medida' => $fila['unidad_medida'],
        'costo_unitario' => (float) $fila['costo_unitario'],
        'stock_minimo' => (float) $fila['stock_minimo'],
        'alerta_stock' => (bool) $fila['alerta_stock'],
    ];
}

responder(200, ['ok' => true, 'insumos' => $insumos]);
