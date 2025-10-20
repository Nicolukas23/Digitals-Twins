-- Insertar usuarios de prueba
-- Las contraseñas están hasheadas con bcrypt
-- Contraseñas en texto plano:
-- admin@ejemplo.com = Admin123!
-- vendedor@ejemplo.com = Vendedor123!
-- tendero@ejemplo.com = Tendero123!

INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES 
    ('admin@ejemplo.com', '$2a$10$X7KgF5C8hu9jYrH8q4DpB.3zCxhxZc9WvmZ5sX7KZ4VCj1Y0gPyWi', 'Administrador Sistema', 'admin'),
    ('vendedor@ejemplo.com', '$2a$10$QZ1yRR5oGm5V5.T5wy/wdO8Y0TeQvgXM3BtVZ7zThKkY1hqRfS2Uy', 'Vendedor Principal', 'vendedor'),
    ('tendero@ejemplo.com', '$2a$10$nX5IyGP7sX2Lb9y3I4Nc6uVL8I1vLk/CZ.mE4Xj.tCbvQKqJ1YyTi', 'Tendero Demo', 'tendero')
ON CONFLICT (email) DO NOTHING;