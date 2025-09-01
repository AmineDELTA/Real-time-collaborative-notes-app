import { apiFetch } from './api.js';

export async function register(username, email, password) {
    return apiFetch('/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, email, password })
    });
}

export async function login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return apiFetch('/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params
    });
}