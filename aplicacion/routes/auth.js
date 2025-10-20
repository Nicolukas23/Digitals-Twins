const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// Validaciones comunes
const emailValidation = body('email')
    .isEmail()
    .withMessage('Ingrese un correo electrónico válido');

const passwordValidation = body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un carácter especial');

// Ruta de registro
router.post('/register', [
    emailValidation,
    passwordValidation,
    body('nombre').notEmpty().withMessage('El nombre es requerido')
], authController.register);

// Ruta de login
router.post('/login', [
    emailValidation,
    body('password').notEmpty().withMessage('La contraseña es requerida')
], authController.login);

module.exports = router;