<?php
declare(strict_types=1);

/**
 * Configuración compartida de la API PHP del MVP.
 * Las credenciales pueden sobreescribirse con variables de entorno.
 */
function configurarCors(): void
{
    $origen = getenv('CORS_ORIGIN');
    header('Access-Control-Allow-Origin: ' . ($origen !== false && $origen !== '' ? $origen : '*'));
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Content-Type: application/json; charset=UTF-8');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function conectarBaseDatos(): mysqli
{
    $host = getenv('DB_HOST') ?: 'localhost';
    $nombre = getenv('DB_NAME') ?: 'batidos_mvp';
    $usuario = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS');
    $password = $password === false ? '' : $password;
    $puerto = getenv('DB_PORT') ?: '3306';

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    try {
        $conexion = new mysqli($host, $usuario, $password, $nombre, (int) $puerto);
    } catch (mysqli_sql_exception $error) {
        responder(500, [
            'ok' => false,
            'mensaje' => 'No se pudo conectar con la base de datos.',
            'detalle' => $error->getMessage(),
        ]);
    }

    $conexion->set_charset('utf8mb4');

    return $conexion;
}

function responder(int $codigo, array $datos): never
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function leerCuerpo(): array
{
    $crudo = file_get_contents('php://input');
    $datos = json_decode($crudo === false ? '' : $crudo, true);

    return is_array($datos) ? $datos : [];
}

function texto(array $datos, string $clave, string $valorPorDefecto = ''): string
{
    $valor = $datos[$clave] ?? $valorPorDefecto;

    return is_scalar($valor) ? trim((string) $valor) : $valorPorDefecto;
}

function numero(array $datos, string $clave, float $valorPorDefecto = 0.0): float
{
    $valor = $datos[$clave] ?? $valorPorDefecto;

    return is_numeric($valor) ? (float) $valor : $valorPorDefecto;
}

function enteroOpcional(array $datos, string $clave): ?int
{
    $valor = $datos[$clave] ?? null;

    if ($valor === null || $valor === '') {
        return null;
    }

    return is_numeric($valor) ? (int) $valor : null;
}

function normalizarFecha(string $fecha): string
{
    $fecha = trim($fecha);

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        return $fecha . ' 00:00:00';
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $fecha)) {
        return str_replace('T', ' ', substr($fecha, 0, 19));
    }

    return $fecha;
}
