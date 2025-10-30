-- Índices espaciales para optimizar consultas geoespaciales
CREATE INDEX idx_tenderos_ubicacion ON tenderos USING GIST(ubicacion);
CREATE INDEX idx_zonas_area ON zonas USING GIST(area);
CREATE INDEX idx_ciudades_bounds ON ciudades USING GIST(bounds);
CREATE INDEX idx_visitas_ubicacion ON visitas_vendedor USING GIST(ubicacion_visita);

-- Índices convencionales para optimizar consultas frecuentes
CREATE INDEX idx_tenderos_zona ON tenderos(zona_id);
CREATE INDEX idx_vendedores_zona ON vendedores(zona_asignada);
CREATE INDEX idx_visitas_fecha ON visitas_vendedor(fecha_visita);
CREATE INDEX idx_ventas_visita ON ventas(visita_id);
CREATE INDEX idx_inventario_tendero ON inventario_tendero(tendero_id, producto_id);