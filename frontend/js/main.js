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
        
        <!-- LOGIN SECTION - Only Email + Password -->
        <div id="login-section">
            <h3>Login</h3>
            <input id="login-email" placeholder="Email" type="email"><br>
            <input id="login-password" type="password" placeholder="Password"><br>
            <button id="loginBtn">Login</button>
        </div>
        
        <hr>
        
        <!-- REGISTER SECTION - Username + Email + Password -->
        <div id="register-section">
            <h3>Register</h3>
            <input id="register-username" placeholder="Username"><br>
            <input id="register-email" placeholder="Email" type="email"><br>
            <input id="register-password" type="password" placeholder="Password"><br>
            <button id="registerBtn">Register</button>
        </div>
        
        <div id="auth-status"></div>
    `;

    // LOGIN - Only uses email and password
    document.getElementById('loginBtn').onclick = async () => {
        try {
            const data = await login(
                document.getElementById('login-email').value,     // Email only
                document.getElementById('login-password').value   // Password only
            );
            token = data.access_token;
            renderSpaces();
        } catch (e) {
            document.getElementById('auth-status').innerText = e.detail || "Login failed";
        }
    };

    // REGISTER - Uses username, email, and password
    document.getElementById('registerBtn').onclick = async () => {
        try {
            await register(
                document.getElementById('register-username').value,  // Username
                document.getElementById('register-email').value,     // Email  
                document.getElementById('register-password').value   // Password
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
        const newBlock = await createBlock(
            token,
            spaceId,
            document.getElementById('block-type').value,
            document.getElementById('block-content').value
        );
        loadBlocks();
        // Send proper WebSocket message for new block
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
                type: "block_update",
                block_id: newBlock.id,
                content: document.getElementById('block-content').value
            }));
        }
    };
    loadBlocks();
    ws = connectToSpace(spaceId, token, (msg) => {
        wslog(JSON.stringify(msg));
        // Fix: Check for the correct message type from backend
        if (msg.type === "block_updated") {
            loadBlocks();
        }
        // Also handle other message types
        if (msg.type === "user_joined" || msg.type === "user_left") {
            wslog(`User event: ${msg.username} ${msg.type.replace('user_', '')}`);
        }
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
            // Send proper WebSocket message with actual data
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: "block_update",
                    block_id: block.id,
                    content: e.target.value
                }));
            }
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