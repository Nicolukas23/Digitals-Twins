// Configuración
const API_URL = 'http://localhost:3000/api';

// Gestión de tokens
const setToken = (token) => {
    localStorage.setItem('token', token);
};

const getToken = () => {
    return localStorage.getItem('token');
};

const removeToken = () => {
    localStorage.removeItem('token');
};

// Verificar si el usuario está autenticado
const checkAuth = () => {
    const token = getToken();
    if (!token && !window.location.pathname.includes('index.html')) {
        window.location.href = '/index.html';
    }
};

// Configurar timer para expiración de sesión
let inactivityTimer;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos

const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        removeToken();
        window.location.href = '/index.html?expired=true';
    }, INACTIVITY_TIMEOUT);
};

// Eventos para resetear el timer
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// Manejo del formulario de login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.classList.add('d-none');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                })
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                window.location.href = '/dashboard.html';
            } else {
                errorMessage.textContent = data.message;
                errorMessage.classList.remove('d-none');
            }
        } catch (error) {
            errorMessage.textContent = 'Error al conectar con el servidor';
            errorMessage.classList.remove('d-none');
        }
    });
}

// Manejo del formulario de registro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.classList.add('d-none');

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombre: document.getElementById('nombre').value,
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                })
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                window.location.href = '/dashboard.html';
            } else {
                errorMessage.textContent = data.message;
                errorMessage.classList.remove('d-none');
            }
        } catch (error) {
            errorMessage.textContent = 'Error al conectar con el servidor';
            errorMessage.classList.remove('d-none');
        }
    });
}

// Verificar si hay mensaje de sesión expirada
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            errorMessage.classList.remove('d-none');
        }
    }
});