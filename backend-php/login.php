<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

$conexion = new mysqli("localhost", "root", "", "batidos_mvp");
if ($conexion->connect_error) {
    http_response_code(500);
    echo json_encode(["ok" => false, "mensaje" => "Error de conexión a BD"]);
    exit();
}

$datos = json_decode(file_get_contents("php://input"), true);
$email = $conexion->real_escape_string($datos['email'] ?? '');
$password = $datos['password'] ?? '';

$resultado = $conexion->query("SELECT id, nombre, email, password, rol FROM usuarios WHERE email = '$email' LIMIT 1");

if ($resultado && $usuario = $resultado->fetch_assoc()) {
    // 1. Validación de hash de contraseña
    if (password_verify($password, $usuario['password'])) {
        // 2. Configuración de expiración de sesión (30 minutos = 1800 segundos)
        $expira = time() + 1800;
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['expira'] = $expira;

        echo json_encode([
            "ok" => true,
            "usuario" => [
                "id" => $usuario['id'],
                "nombre" => $usuario['nombre'],
                "rol" => $usuario['rol']
            ],
            "expira_en" => $expira * 1000 // En milisegundos para React
        ]);
        exit();
    }
}

http_response_code(401);
echo json_encode(["ok" => false, "mensaje" => "Credenciales incorrectas"]);
$conexion->close();