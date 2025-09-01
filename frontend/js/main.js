import { register, login } from './auth.js';
import { getSpaces, createSpace } from './spaces.js';
import { getBlocks, createBlock, updateBlock } from './blocks.js';
import { connectToSpace } from './websocket.js';

let token = '';
let currentSpaceId = null;
let ws = null;

const app = document.getElementById('app');

function renderLogin() {
    app.innerHTML = `
        <h2>Login / Register</h2>
        <input id="username" placeholder="Username"><br>
        <input id="email" placeholder="Email (register only)"><br>
        <input id="password" type="password" placeholder="Password"><br>
        <button id="loginBtn">Login</button>
        <button id="registerBtn">Register</button>
        <div id="auth-status"></div>
    `;
    document.getElementById('loginBtn').onclick = async () => {
        try {
            const data = await login(
                document.getElementById('username').value,
                document.getElementById('password').value
            );
            token = data.access_token;
            renderSpaces();
        } catch (e) {
            document.getElementById('auth-status').innerText = e.detail || "Login failed";
        }
    };
    document.getElementById('registerBtn').onclick = async () => {
        try {
            await register(
                document.getElementById('username').value,
                document.getElementById('email').value,
                document.getElementById('password').value
            );
            document.getElementById('auth-status').innerText = "Registered! Now login.";
        } catch (e) {
            document.getElementById('auth-status').innerText = e.detail || "Register failed";
        }
    };
}

async function renderSpaces() {
    app.innerHTML = `
        <nav>
            <button id="logoutBtn">Logout</button>
        </nav>
        <h2>Spaces</h2>
        <input id="space-name" placeholder="New Space Name">
        <button id="createSpaceBtn">Create Space</button>
        <ul id="spaces"></ul>
        <div id="space-content"></div>
    `;
    document.getElementById('logoutBtn').onclick = () => {
        token = '';
        currentSpaceId = null;
        if (ws) ws.close();
        renderLogin();
    };
    document.getElementById('createSpaceBtn').onclick = async () => {
        await createSpace(token, document.getElementById('space-name').value);
        loadSpaces();
    };
    loadSpaces();
}

async function loadSpaces() {
    const spaces = await getSpaces(token);
    const ul = document.getElementById('spaces');
    ul.innerHTML = '';
    spaces.forEach(space => {
        const li = document.createElement('li');
        li.innerText = `${space.name} (id: ${space.id})`;
        li.onclick = () => renderBlocks(space.id);
        ul.appendChild(li);
    });
}

async function renderBlocks(spaceId) {
    currentSpaceId = spaceId;
    if (ws) ws.close();
    document.getElementById('space-content').innerHTML = `
        <h3>Blocks in Space</h3>
        <input id="block-content" placeholder="Block content">
        <select id="block-type">
            <option value="TEXT">TEXT</option>
            <option value="HEADING">HEADING</option>
            <option value="BULLET_LIST">BULLET_LIST</option>
            <option value="NUMBERED_LIST">NUMBERED_LIST</option>
        </select>
        <button id="addBlockBtn">Add Block</button>
        <div id="blocks"></div>
        <h4>WebSocket Log</h4>
        <pre id="wslog"></pre>
    `;
    document.getElementById('addBlockBtn').onclick = async () => {
        await createBlock(
            token,
            spaceId,
            document.getElementById('block-type').value,
            document.getElementById('block-content').value
        );
        loadBlocks();
        if (ws) ws.send(JSON.stringify({ type: "block_update" }));
    };
    loadBlocks();
    ws = connectToSpace(spaceId, token, (msg) => {
        wslog(JSON.stringify(msg));
        if (msg.type === "block_update") loadBlocks();
    });
}

async function loadBlocks() {
    const blocks = await getBlocks(token, currentSpaceId);
    const div = document.getElementById('blocks');
    div.innerHTML = '';
    blocks.forEach(block => {
        const blockDiv = document.createElement('div');
        blockDiv.innerHTML = `
            <p><strong>${block.type}:</strong></p>
        `;
        const input = document.createElement('input');
        input.value = block.content;
        input.addEventListener('change', async (e) => {
            await updateBlock(token, block.id, e.target.value);
            if (ws) ws.send(JSON.stringify({ type: "block_update" }));
        });
        blockDiv.appendChild(input);
        div.appendChild(blockDiv);
    });
}

function wslog(msg) {
    const log = document.getElementById('wslog');
    log.textContent += msg + '\n';
    log.scrollTop = log.scrollHeight;
}

// Clean up WebSocket when page unloads
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
});

// Initialize the app
if (token) {
    renderSpaces();
} else {
    renderLogin();
}