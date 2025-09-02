import { apiFetch } from './api.js';

export async function getBlocks(token, spaceId) {
    return apiFetch(`/blocks/space/${spaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
}

export async function createBlock(token, spaceId, type, content) {
    return apiFetch('/blocks/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ space_id: spaceId, type, content })
    });
}

export async function updateBlock(token, blockId, content) {
    return apiFetch(`/blocks/${blockId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    });
}

export async function deleteBlock(token, blockId) {
    return apiFetch(`/blocks/${blockId}`, {
        method: `DELETE`,
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
}