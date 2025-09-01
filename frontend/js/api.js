export const BACKEND_URL = "http://localhost:8000";

export async function apiFetch(path, options = {}) {
    const url = `${BACKEND_URL}${path}`;
    return fetch(url, options).then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw data;
        return data;
    });
}