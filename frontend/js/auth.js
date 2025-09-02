import { apiFetch } from './api.js';

export async function register(username, email, password) {
    return apiFetch('/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, email, password })
    });
}

export async function login(email, password) {
    const formData = new FormData();
    formData.append('username', email);  // OAuth2 expects 'username' field but we put email in it
    formData.append('password', password);
    
    return apiFetch('/auth/login', {
        method: 'POST',
        body: formData  // Send as form data, not JSON
    });
}