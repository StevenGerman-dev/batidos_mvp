-- Migración: SCRUM Rentabilidad + Registro de Mermas
-- Aplicar sobre una base batidos_mvp ya existente.
-- Para instalaciones nuevas, importar directamente batidos_mvp.sql.

START TRANSACTION;

ALTER TABLE `insumos`
  ADD COLUMN `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00'
  COMMENT 'Costo vigente por unidad de medida' AFTER `unidad_medida`;

ALTER TABLE `detalle_ventas`
  ADD COLUMN `costo_unitario` decimal(10,2) NOT NULL DEFAULT '0.00'
  COMMENT 'Costo congelado al momento de la venta' AFTER `cantidad_usada`;

-- Costos de ejemplo para los insumos iniciales del MVP.
UPDATE `insumos` SET `costo_unitario` = 1.20 WHERE `id` = 1 AND `costo_unitario` = 0.00;
UPDATE `insumos` SET `costo_unitario` = 0.90 WHERE `id` = 2 AND `costo_unitario` = 0.00;
UPDATE `insumos` SET `costo_unitario` = 0.35 WHERE `id` = 3 AND `costo_unitario` = 0.00;

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
  KEY `fecha` (`fecha`),
  CONSTRAINT `mermas_ibfk_1` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `mermas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

-- Usuario inicial para probar el login (password: admin123), si no existe.
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `created_at`)
SELECT 1, 'Administrador', 'admin@batidos.com',
       '$2y$10$r6zJma31LKUhIIEd47eNAe5QF12h5FE7zM33mIF/s/QGxSmf4is/y',
       'Administrador', '2026-11-21 00:00:00'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `usuarios` WHERE `id` = 1 OR `email` = 'admin@batidos.com'
);

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
