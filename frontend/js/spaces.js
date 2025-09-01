import { apiFetch } from './api.js';

export async function getSpaces(token) {
    return apiFetch('/spaces/my-spaces', {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function createSpace(token, name) {
    return apiFetch('/spaces/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });
}