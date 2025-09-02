export function connectToSpace(spaceId, token, onMessage) {
    const ws = new WebSocket(`ws://localhost:8000/ws/space/${spaceId}?token=${token}`);
    
    ws.onopen = () => {
        console.log('WebSocket connected to space', spaceId);
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
        }
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    return ws;
}