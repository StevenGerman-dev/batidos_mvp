-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 04-11-2026 a las 03:06:57
-- Versión del servidor: 9.1.0
-- Versión de PHP: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `batidos_mvp`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

DROP TABLE IF EXISTS `detalle_ventas`;
CREATE TABLE IF NOT EXISTS `detalle_ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `insumo_id` int NOT NULL,
  `cantidad_usada` decimal(10,2) NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Costo congelado al momento de la venta',
  PRIMARY KEY (`id`),
  KEY `venta_id` (`venta_id`),
  KEY `insumo_id` (`insumo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `insumos`
--

DROP TABLE IF EXISTS `insumos`;
CREATE TABLE IF NOT EXISTS `insumos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unidad_medida` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Costo vigente por unidad de medida',
  `stock_minimo` decimal(10,2) DEFAULT '5.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `insumos`
--

INSERT INTO `insumos` (`id`, `nombre`, `stock_actual`, `unidad_medida`, `costo_unitario`, `stock_minimo`, `created_at`) VALUES
(1, 'Pulpa de Frutilla', 15.00, 'unidades', 1.20, 5.00, '2026-11-04 03:00:19'),
(2, 'Leche Entera', 20.00, 'litros', 0.90, 5.00, '2026-11-04 03:00:19'),
(3, 'Vasos 16oz', 100.00, 'unidades', 0.35, 20.00, '2026-11-04 03:00:19');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mermas`
--

DROP TABLE IF EXISTS `mermas`;
CREATE TABLE IF NOT EXISTS `mermas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `insumo_id` int NOT NULL,
  `tipo` enum('MERMA','AJUSTE') NOT NULL DEFAULT 'MERMA',
  `cantidad` decimal(10,2) NOT NULL COMMENT 'Magnitud del movimiento; siempre positiva',
  `signo` tinyint NOT NULL DEFAULT '-1' COMMENT '-1 descuenta stock, 1 suma stock',
  `motivo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `stock_anterior` decimal(10,2) NOT NULL,
  `stock_nuevo` decimal(10,2) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `insumo_id` (`insumo_id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Empleado',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Usuario inicial para probar el login (password: admin123).
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `created_at`) VALUES
(1, 'Administrador', 'admin@batidos.com', '$2y$10$r6zJma31LKUhIIEd47eNAe5QF12h5FE7zM33mIF/s/QGxSmf4is/y', 'Administrador', '2026-11-21 00:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

DROP TABLE IF EXISTS `ventas`;
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `producto` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `detalle_ventas_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_ventas_ibfk_2` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`) ON DELETE RESTRICT;

--
-- Filtros para la tabla `mermas`
--
ALTER TABLE `mermas`
  ADD CONSTRAINT `mermas_ibfk_1` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `mermas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;
COMMIT;

--
-- Vista analítica: rentabilidad por venta/producto.
-- Usa el costoUnitario congelado en detalle_ventas cuando existe y,
-- si no, el costo vigente del insumo como respaldo.
--
CREATE OR REPLACE VIEW `vw_rentabilidad_ventas` AS
SELECT
  `v`.`id` AS `venta_id`,
  `v`.`fecha` AS `fecha`,
  `v`.`producto` AS `producto`,
  `v`.`cantidad` AS `cantidad`,
  `v`.`total` AS `total_cobrado`,
  COALESCE(`c`.`costo_total`, 0.00) AS `costo_total`,
  (`v`.`total` - COALESCE(`c`.`costo_total`, 0.00)) AS `ganancia`,
  CASE
    WHEN `v`.`total` > 0 THEN ROUND(((`v`.`total` - COALESCE(`c`.`costo_total`, 0.00)) / `v`.`total`) * 100, 2)
    ELSE 0.00
  END AS `margen_porcentaje`,
  CASE
    WHEN `v`.`cantidad` > 0 THEN ROUND((`v`.`total` - COALESCE(`c`.`costo_total`, 0.00)) / `v`.`cantidad`, 2)
    ELSE 0.00
  END AS `ganancia_por_unidad`
FROM `ventas` `v`
LEFT JOIN (
  SELECT
    `dv`.`venta_id` AS `venta_id`,
    SUM(`dv`.`cantidad_usada` * COALESCE(NULLIF(`dv`.`costo_unitario`, 0.00), `i`.`costo_unitario`)) AS `costo_total`
  FROM `detalle_ventas` `dv`
  INNER JOIN `insumos` `i` ON `i`.`id` = `dv`.`insumo_id`
  GROUP BY `dv`.`venta_id`
) `c` ON `c`.`venta_id` = `v`.`id`;

--
-- Vista de mermas con el nombre legible del insumo y del usuario.
--
CREATE OR REPLACE VIEW `vw_mermas_detalle` AS
SELECT
  `m`.`id` AS `id`,
  `m`.`fecha` AS `fecha`,
  `m`.`tipo` AS `tipo`,
  `m`.`cantidad` AS `cantidad`,
  `m`.`signo` AS `signo`,
  `m`.`motivo` AS `motivo`,
  `m`.`observaciones` AS `observaciones`,
  `m`.`stock_anterior` AS `stock_anterior`,
  `m`.`stock_nuevo` AS `stock_nuevo`,
  `i`.`id` AS `insumo_id`,
  `i`.`nombre` AS `insumo`,
  `i`.`unidad_medida` AS `unidad_medida`,
  `u`.`nombre` AS `usuario`
FROM `mermas` `m`
INNER JOIN `insumos` `i` ON `i`.`id` = `m`.`insumo_id`
LEFT JOIN `usuarios` `u` ON `u`.`id` = `m`.`usuario_id`;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
