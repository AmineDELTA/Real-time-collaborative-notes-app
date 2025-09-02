import { register, login } from './auth.js';
import { getSpaces, createSpace } from './spaces.js';
import { getBlocks, createBlock, updateBlock, deleteBlock} from './blocks.js';
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
            <h1>📝 Notes</h1>
            
            <div class="nav-center">
                <div class="nav-spaces">
                    <span class="nav-spaces-label">Spaces:</span>
                    <ul id="nav-spaces-list" class="nav-spaces-list"></ul>
                </div>
                
                <div class="nav-create-space">
                    <input id="nav-space-name" class="nav-create-input" placeholder="New space...">
                    <button id="nav-createSpaceBtn" class="nav-create-btn">Create</button>
                </div>
            </div>
            
            <div class="nav-right">
                <button id="logoutBtn">Logout</button>
            </div>
        </nav>
        
        <div id="space-content"></div>
    `;
    
    document.getElementById('logoutBtn').onclick = () => {
        token = '';
        currentSpaceId = null;
        if (ws) ws.close();
        renderLogin();
    };
    
    document.getElementById('nav-createSpaceBtn').onclick = async () => {
        const spaceName = document.getElementById('nav-space-name').value;
        if (!spaceName.trim()) {
            alert('Please enter a space name');
            return;
        }
        await createSpace(token, spaceName);
        document.getElementById('nav-space-name').value = '';
        loadSpaces();
    };
    
    loadSpaces();
}

async function loadSpaces() {
    const spaces = await getSpaces(token);
    const ul = document.getElementById('nav-spaces-list');
    
    if (!ul) {
        console.error('nav-spaces-list not found');
        return;
    }
    
    ul.innerHTML = '';
    
    if (spaces.length === 0) {
        ul.innerHTML = '<li style="font-size: 11px; color: #6b6b6b; padding: 4px;">No spaces</li>';
        return;
    }
    
    spaces.forEach(space => {
        const li = document.createElement('li');
        li.className = 'nav-space-item';
        li.textContent = space.name;
        li.title = `Space ID: ${space.id}`;
        
        li.onclick = () => {
            document.querySelectorAll('.nav-space-item').forEach(item => 
                item.classList.remove('active')
            );
            li.classList.add('active');
            renderBlocks(space.id);
        };
        
        ul.appendChild(li);
    });
}

async function renderBlocks(spaceId) {
    currentSpaceId = spaceId;
    if (ws) ws.close();

    document.getElementById('space-content').innerHTML = `
        <div class="block-editor">
            <div class="add-block-container">
                <div class="add-block-input">
                    <input id="block-content" placeholder="Type '/' for commands or just start writing...">
                    <select id="block-type">
                        <option value="TEXT">Text</option>
                        <option value="HEADING">Heading</option>
                        <option value="BULLET_LIST">• Bullet List</option>
                        <option value="NUMBERED_LIST">1. Numbered List</option>
                    </select>
                    <button id="addBlockBtn">Add</button>
                </div>
            </div>
            <div id="blocks" class="blocks-container"></div>
            <div id="wslog-container" class="websocket-log">
                <h4>WebSocket Log <button onclick="this.parentElement.classList.toggle('show')">Toggle</button></h4>
                <pre id="wslog"></pre>
            </div>
        </div>
    `;
    document.getElementById('addBlockBtn').onclick = async () => {
        const content = document.getElementById('block-content').value;
        const type = document.getElementById('block-type').value;
        
        if (!content.trim()) {
            alert('Please enter block content');
            return;
        }
        
        try {
            const newBlock = await createBlock(token, spaceId, type, content);
            
            // Clear the form
            document.getElementById('block-content').value = '';
            
            loadBlocks();
            
            // Send WebSocket notification
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: "block_update",
                    block_id: newBlock.id,
                    content: content
                }));
            }
        } catch (error) {
            alert('Failed to create block');
        }
    };
    loadBlocks();
    ws = connectToSpace(spaceId, token, (msg) => {
        wslog(JSON.stringify(msg));
        
        // Handle block updates and deletions
        if (msg.type === "block_updated" || msg.type === "block_deleted") {
            loadBlocks();
        }
        
        // Handle user events
        if (msg.type === "user_joined" || msg.type === "user_left") {
            wslog(`User event: ${msg.username} ${msg.type.replace('user_', '')}`);
        }
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

async function loadBlocks() {
    const blocks = await getBlocks(token, currentSpaceId);
    const div = document.getElementById('blocks');
    div.innerHTML = '';
    
    blocks.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'block';
        blockDiv.dataset.blockId = block.id;
        
        // Create block controls
        const controls = document.createElement('div');
        controls.className = 'block-controls';
        controls.innerHTML = `
            <button class="block-control-btn update" title="Update">✓</button>
            <button class="block-control-btn delete" title="Delete">×</button>
        `;
        
        // Create input based on block type
        let input;
        if (block.type === 'HEADING') {
            input = document.createElement('input');
            input.className = 'block-input heading';
            input.placeholder = 'Heading';
        } else if (block.type === 'BULLET_LIST') {
            input = document.createElement('textarea');
            input.className = 'block-input bullet-list';
            input.placeholder = 'List item';
            input.rows = 1;
        } else if (block.type === 'NUMBERED_LIST') {
            input = document.createElement('textarea');
            input.className = 'block-input numbered-list';
            input.placeholder = `${index + 1}. List item`;
            input.rows = 1;
        } else {
            input = document.createElement('textarea');
            input.className = 'block-input text';
            input.placeholder = 'Type something...';
            input.rows = 1;
        }
        
        input.value = block.content;
        
        // Auto-resize textarea
        if (input.tagName === 'TEXTAREA') {
            input.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
            // Initial resize
            setTimeout(() => {
                input.style.height = input.scrollHeight + 'px';
            }, 0);
        }
        
        // Real-time typing with debounce
        let typingTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(async () => {
                await updateBlock(token, block.id, e.target.value);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "block_update",
                        block_id: block.id,
                        content: e.target.value
                    }));
                }
            }, 500);
        });
        
        // Control button handlers
        controls.querySelector('.update').onclick = async () => {
            await updateBlock(token, block.id, input.value);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "block_update",
                    block_id: block.id,
                    content: input.value
                }));
            }
        };
        
        controls.querySelector('.delete').onclick = async () => {
            if (confirm('Delete this block?')) {
                await deleteBlock(token, block.id);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "block_deleted",
                        block_id: block.id
                    }));
                }
                loadBlocks();
            }
        };
        
        blockDiv.appendChild(controls);
        blockDiv.appendChild(input);
        div.appendChild(blockDiv);
    });
}