const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                message: 'Acceso denegado. Token no proporcionado.'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Sesión expirada. Por favor, inicie sesión nuevamente.'
            });
        }
        res.status(401).json({
            message: 'Token inválido'
        });
    }
};

module.exports = authMiddleware;