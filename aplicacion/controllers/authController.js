const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/auth');
const { validationResult } = require('express-validator');

// Configuración del pool de conexiones
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'gemelos_digitales',
    user: process.env.USER,
    password: '',
    max: 20,
});

const authController = {
    // Registro de usuario
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, nombre } = req.body;

            // Verificar si el usuario ya existe
            const userExists = await pool.query(
                'SELECT id FROM usuarios WHERE email = $1',
                [email]
            );

            if (userExists.rows.length > 0) {
                return res.status(400).json({
                    message: 'El correo electrónico ya está registrado'
                });
            }

            // Encriptar contraseña
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Crear usuario
            const result = await pool.query(
                'INSERT INTO usuarios (email, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id',
                [email, passwordHash, nombre]
            );

            // Generar token
            const token = generateToken(result.rows[0].id);

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                token
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({
                message: 'Error al registrar usuario'
            });
        }
    },

    // Login de usuario
    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            // Buscar usuario
            const result = await pool.query(
                'SELECT id, email, password_hash, nombre FROM usuarios WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    message: 'Usuario o contraseña inválidos'
                });
            }

            const user = result.rows[0];

            // Verificar contraseña
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({
                    message: 'Usuario o contraseña inválidos'
                });
            }

            // Actualizar último login
            await pool.query(
                'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Generar token
            const token = generateToken(user.id);

            res.json({
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                message: 'Error al iniciar sesión'
            });
        }
    }
};

module.exports = authController;