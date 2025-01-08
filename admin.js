const ADMIN_PASSWORD = '123456'; // 在实际应用中应该使用更安全的方式存储密码

let autoRefreshInterval;

function verifyPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) { // 使用常量定义的密码
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        
        // 登录成功后重新加载数据
        if (window.adminPanel) {
            window.adminPanel.loadInitialData();
        }
    } else {
        alert('Invalid password. Access denied.');
    }
}

function loadConversations() {
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    const conversationList = document.querySelector('.conversation-list');
    conversationList.innerHTML = '';

    conversations.forEach((conv, index) => {
        const convElement = document.createElement('div');
        convElement.className = 'admin-conversation-item';
        if (conv.isPinned) {
            convElement.classList.add('pinned');
        }
        
        convElement.innerHTML = `
            <div class="conversation-info">
                <div class="title">
                    ${conv.isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                    ${conv.title || 'Untitled Conversation'}
                </div>
                <div class="timestamp">${conv.timestamp}</div>
                <div class="wallet-address">${conv.walletAddress}</div>
                <div class="views-counter">
                    Views: <span class="view-count">${conv.views || 0}</span>
                    <button class="edit-views-btn" onclick="editViews(${index})">Edit</button>
                </div>
                <div class="score-panel">
                    Score: <span class="score-value">${conv.score !== null ? conv.score + '/10' : 'Not rated'}</span>
                    <button class="rate-btn" onclick="rateConversation(${index})">Rate</button>
                </div>
            </div>
            <div class="admin-actions">
                <button onclick="togglePin(${index})">${conv.isPinned ? 'Unpin' : 'Pin'}</button>
                <button onclick="viewConversation(${index})">View</button>
                <button onclick="deleteConversation(${index})" class="delete-btn">Delete</button>
            </div>
        `;
        conversationList.appendChild(convElement);
    });
}

function deleteConversation(index) {
    if (confirm('Are you sure you want to delete this conversation?')) {
        const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
        conversations.splice(index, 1);
        localStorage.setItem('savedConversations', JSON.stringify(conversations));
        loadConversations();
    }
}

function viewConversation(index) {
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    // Increment view count when viewing
    conversations[index].views = (conversations[index].views || 0) + 1;
    localStorage.setItem('savedConversations', JSON.stringify(conversations));
    
    const conversation = conversations[index];
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content">
            <h2>${conversation.title}</h2>
            <div class="conversation-meta">
                <span>Views: ${conversation.views}</span>
                <span>Created: ${conversation.timestamp}</span>
                <span>Score: ${conversation.score !== null ? conversation.score + '/10' : 'Not rated'}</span>
            </div>
            <div class="conversation-details">
                ${conversation.messages.map(msg => 
                    `<div class="message ${msg.type}-message">
                        ${msg.type === 'user' ? 'User' : 'AI'}: ${msg.text}
                    </div>`
                ).join('')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    loadConversations(); // Refresh to show updated view count
}

function createNewChat() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal create-chat-modal';
    modal.innerHTML = `
        <div class="admin-modal-content">
            <h2>Create New Conversation</h2>
            <div class="form-group">
                <label>Title:</label>
                <input type="text" id="new-chat-title" placeholder="Enter conversation title">
            </div>
            <div class="form-group">
                <label>Wallet Address:</label>
                <input type="text" id="new-chat-wallet" placeholder="Enter wallet address">
            </div>
            <div class="form-group">
                <label>Timestamp:</label>
                <input type="datetime-local" id="new-chat-timestamp">
            </div>
            <div class="form-group">
                <label>Messages:</label>
                <div id="messages-container">
                    <div class="message-input">
                        <select class="message-type">
                            <option value="user">User</option>
                            <option value="ai">AI</option>
                        </select>
                        <textarea class="message-text" placeholder="Enter message text"></textarea>
                        <button class="remove-message" onclick="this.parentElement.remove()">×</button>
                    </div>
                </div>
                <button onclick="addMessageInput()" class="add-message-btn">+ Add Message</button>
            </div>
            <div class="modal-buttons">
                <button onclick="submitNewChat()" class="submit-btn">Create</button>
                <button onclick="this.closest('.admin-modal').remove()" class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 设置默认时间为当前时间
    document.getElementById('new-chat-timestamp').value = 
        new Date().toISOString().slice(0, 16);
}

// 添加新的消息输入框
function addMessageInput() {
    const container = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-input';
    messageDiv.innerHTML = `
        <select class="message-type">
            <option value="user">User</option>
            <option value="ai">AI</option>
        </select>
        <textarea class="message-text" placeholder="Enter message text"></textarea>
        <button class="remove-message" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(messageDiv);
}

// 提交新对话
function submitNewChat() {
    const title = document.getElementById('new-chat-title').value.trim();
    const walletAddress = document.getElementById('new-chat-wallet').value.trim();
    const timestamp = new Date(document.getElementById('new-chat-timestamp').value).toLocaleString();
    
    const messageInputs = document.querySelectorAll('.message-input');
    const messages = Array.from(messageInputs).map(input => ({
        type: input.querySelector('.message-type').value,
        text: input.querySelector('.message-text').value.trim()
    })).filter(msg => msg.text);

    if (!title || !walletAddress || !messages.length) {
        alert('Please fill in all required fields');
        return;
    }

    const newChat = {
        title: title,
        timestamp: timestamp,
        walletAddress: walletAddress,
        messages: messages,
        views: 0,
        score: null,
        isPinned: false,
        preview: messages[0].text.substring(0, 50) + '...'
    };

    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    conversations.unshift(newChat);
    localStorage.setItem('savedConversations', JSON.stringify(conversations));
    
    document.querySelector('.create-chat-modal').remove();
    loadConversations();
    showRefreshMessage('New conversation created successfully!');
}

function togglePin(index) {
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    conversations[index].isPinned = !conversations[index].isPinned;
    
    // Move pinned conversation to top if being pinned
    if (conversations[index].isPinned) {
        const pinnedConv = conversations.splice(index, 1)[0];
        conversations.unshift(pinnedConv);
    }
    
    localStorage.setItem('savedConversations', JSON.stringify(conversations));
    loadConversations();
}

function editViews(index) {
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    const conversation = conversations[index];
    
    const newViews = prompt('Enter new view count:', conversation.views || 0);
    
    if (newViews !== null) {
        const viewCount = parseInt(newViews);
        if (!isNaN(viewCount) && viewCount >= 0) {
            conversations[index].views = viewCount;
            localStorage.setItem('savedConversations', JSON.stringify(conversations));
            loadConversations();
        } else {
            alert('Please enter a valid number (0 or greater)');
        }
    }
}

function rateConversation(index) {
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    const conversation = conversations[index];
    
    const newScore = prompt('Rate this conversation (0-10):', conversation.score || '');
    
    if (newScore !== null) {
        const score = parseInt(newScore);
        if (!isNaN(score) && score >= 0 && score <= 10) {
            conversations[index].score = score;
            localStorage.setItem('savedConversations', JSON.stringify(conversations));
            loadConversations();
        } else {
            alert('Please enter a valid number between 0 and 10');
        }
    }
}

// Add keyboard shortcut for admin panel
document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + A to access admin panel
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        window.location.href = 'admin.html';
    }
});

function exportConversations() {
    window.conversationManager.exportToFile();
}

async function importConversations(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const success = await window.conversationManager.importFromFile(file);
        if (success) {
            alert('Conversations imported successfully!');
            loadConversations();
        } else {
            alert('Error importing conversations');
        }
    } catch (error) {
        console.error('Import error:', error);
        alert('Error importing conversations');
    }
}

const style = document.createElement('style');
style.textContent = `
    .refresh-btn {
        background: transparent;
        border: 2px solid #0f0;
        color: #0f0;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        margin-left: 15px;
    }

    .refresh-btn:hover {
        background: rgba(0, 255, 0, 0.2);
    }

    .refresh-btn .refresh-icon {
        font-size: 20px;
        transition: transform 0.5s ease;
    }

    .refresh-btn.refreshing .refresh-icon {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .last-update {
        color: #0f0;
        font-size: 0.8em;
        margin-left: 10px;
    }

    .admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        border-bottom: 2px solid #0f0;
        padding-bottom: 15px;
    }

    .admin-header .matrix-title {
        margin: 0;
        font-size: 2em;
        color: #0f0;
        text-shadow: 0 0 10px #0f0;
        letter-spacing: 3px;
        font-family: 'Courier New', monospace;
        text-transform: uppercase;
        animation: textGlow 1.5s ease-in-out infinite alternate;
    }

    @keyframes textGlow {
        from {
            text-shadow: 0 0 10px #0f0;
        }
        to {
            text-shadow: 0 0 20px #0f0, 0 0 30px #0f0;
        }
    }

    .create-chat-modal .admin-modal-content {
        width: 600px;
        max-width: 90vw;
    }

    .form-group {
        margin-bottom: 15px;
    }

    .form-group label {
        display: block;
        margin-bottom: 5px;
        color: #0f0;
    }

    .form-group input, .form-group textarea, .form-group select {
        width: 100%;
        padding: 8px;
        background: rgba(0, 20, 0, 0.8);
        border: 1px solid #0f0;
        color: #0f0;
        font-family: 'Courier New', monospace;
    }

    .message-input {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: start;
    }

    .message-input select {
        width: 100px;
    }

    .message-input textarea {
        flex-grow: 1;
        height: 60px;
        resize: vertical;
    }

    .remove-message {
        background: transparent;
        border: 1px solid #f00;
        color: #f00;
        width: 30px;
        height: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }

    .add-message-btn {
        width: 100%;
        margin-top: 10px;
        background: rgba(0, 255, 0, 0.2);
    }

    .modal-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    }

    .submit-btn {
        background: #0f0;
        color: #000;
    }

    .cancel-btn {
        background: transparent;
        border: 1px solid #0f0;
        color: #0f0;
    }

    .admin-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .admin-modal-content {
        background: #000;
        border: 2px solid #0f0;
        padding: 20px;
        width: 500px;
        max-width: 90%;
        color: #0f0;
    }

    .admin-modal h2 {
        margin-top: 0;
        color: #0f0;
        border-bottom: 1px solid #0f0;
        padding-bottom: 10px;
    }

    .admin-modal input,
    .admin-modal textarea {
        width: 100%;
        padding: 8px;
        margin-top: 5px;
        background: #000;
        border: 1px solid #0f0;
        color: #0f0;
    }

    .admin-modal textarea {
        height: 100px;
        resize: vertical;
    }

    .modal-buttons {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .modal-buttons button {
        padding: 8px 16px;
        cursor: pointer;
    }

    .messages-container {
        margin-top: 20px;
    }

    .messages-container h3 {
        margin-bottom: 10px;
        color: #0f0;
    }

    .message-input {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
    }

    .message-input select {
        width: 80px;
        background: #000;
        border: 1px solid #0f0;
        color: #0f0;
    }

    .message-input textarea {
        flex-grow: 1;
        height: 60px;
    }

    .remove-message {
        width: 30px;
        height: 30px;
        background: transparent;
        border: 1px solid #f00;
        color: #f00;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .add-message-btn {
        width: 100%;
        margin-top: 10px;
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #0f0;
        color: #0f0;
        padding: 8px;
        cursor: pointer;
    }

    .add-message-btn:hover {
        background: rgba(0, 255, 0, 0.3);
    }
`;
document.head.appendChild(style);

function setupRefreshButton() {
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshButton.classList.add('refreshing');
            loadConversations();
            setTimeout(() => {
                refreshButton.classList.remove('refreshing');
            }, 500);
        });
    }
}

function startAutoRefresh() {
    // 每30秒自动刷新一次
    autoRefreshInterval = setInterval(() => {
        loadConversations();
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

window.addEventListener('unload', () => {
    stopAutoRefresh();
});

// 导出函数到全局作用域
window.createNewChat = createNewChat;
window.addMessageInput = addMessageInput;
window.submitNewChat = submitNewChat;

class AdminPanel {
    constructor() {
        console.log('AdminPanel constructor called');
        this.initFirebase();
        this.setupEventListeners();
        // 立即加载初始数据
        this.loadInitialData();
    }

    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            const snapshot = await this.conversationsRef.once('value');
            this.updateConversationList(snapshot);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    initFirebase() {
        try {
            console.log('Initializing Firebase in AdminPanel...');
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
            }
            this.db = firebase.database();
            this.conversationsRef = this.db.ref('/conversations');
            
            // 测试数据库连接
            this.testDatabaseConnection();
            
            // 监听后续数据变化
            this.conversationsRef.on('value', (snapshot) => {
                console.log('Received data update in AdminPanel:', snapshot.val());
                this.updateConversationList(snapshot);
            }, (error) => {
                console.error('Error listening to Firebase:', error);
            });
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    async testDatabaseConnection() {
        try {
            const connectedRef = this.db.ref(".info/connected");
            connectedRef.on("value", (snap) => {
                if (snap.val() === true) {
                    console.log("✅ Connected to Firebase!");
                } else {
                    console.log("❌ Not connected to Firebase");
                }
            });
        } catch (error) {
            console.error('Database connection test failed:', error);
        }
    }

    updateConversationList(snapshot) {
        const container = document.querySelector('.conversation-list');
        container.innerHTML = '';
        
        const conversations = [];
        snapshot.forEach(child => {
            conversations.push({
                key: child.key,
                data: child.val().conversation
            });
        });

        // 对对话进行排序：置顶的在前，按时间倒序排列
        conversations.sort((a, b) => {
            if (a.data.isPinned && !b.data.isPinned) return -1;
            if (!a.data.isPinned && b.data.isPinned) return 1;
            return new Date(b.data.timestamp) - new Date(a.data.timestamp);
        });

        conversations.forEach(({ key, data }) => {
            const element = this.createConversationElement(key, data);
            container.appendChild(element);
        });
    }

    createConversationElement(key, conv) {
        const element = document.createElement('div');
        element.className = 'admin-conversation-item';
        if (conv.isPinned) {
            element.classList.add('pinned');
        }
        
        const title = conv.title || 'Untitled';
        const timestamp = new Date(conv.timestamp).toLocaleString();
        const walletAddress = conv.walletAddress || 'Unknown';
        
        element.innerHTML = `
            <div class="conversation-info">
                <div class="title">
                    ${conv.isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                    ${title}
                </div>
                <div class="timestamp">${timestamp}</div>
                <div class="wallet-address">${walletAddress}</div>
                <div class="stats-row">
                    <div class="views-counter">
                        <span class="eye-icon">👁</span>
                        <input type="number" class="views-input" value="${conv.views || 0}" min="0">
                        <button class="save-views-btn">Save</button>
                    </div>
                    <div class="rating-counter">
                        <span class="star-icon">⭐</span>
                        <input type="number" class="rating-input" value="${conv.rating || 0}" min="0" max="10" step="0.1">
                        <button class="save-rating-btn">Save</button>
                    </div>
                </div>
            </div>
            <div class="admin-actions">
                <button class="pin-btn">${conv.isPinned ? 'Unpin' : 'Pin'}</button>
                <button class="view-btn">View</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;

        // 添加事件监听器
        element.querySelector('.pin-btn').addEventListener('click', () => this.togglePin(key, conv));
        element.querySelector('.view-btn').addEventListener('click', () => this.viewConversation(key, conv));
        element.querySelector('.delete-btn').addEventListener('click', () => this.deleteConversation(key));
        
        // 添加保存统计信息的事件监听器
        element.querySelector('.save-views-btn').addEventListener('click', () => {
            const newViews = parseInt(element.querySelector('.views-input').value) || 0;
            this.updateViews(key, newViews);
        });

        element.querySelector('.save-rating-btn').addEventListener('click', () => {
            const newRating = parseFloat(element.querySelector('.rating-input').value) || 0;
            this.updateRating(key, newRating);
        });

        return element;
    }

    async updateViews(key, newViews) {
        try {
            const updates = {};
            updates[`/conversations/${key}/conversation/views`] = newViews;
            await this.db.ref().update(updates);
            console.log('Views updated successfully');
        } catch (error) {
            console.error('Error updating views:', error);
            alert('Failed to update views: ' + error.message);
        }
    }

    async updateRating(key, newRating) {
        try {
            if (newRating < 0 || newRating > 10) {
                alert('Rating must be between 0 and 10');
                return;
            }
            const updates = {};
            updates[`/conversations/${key}/conversation/rating`] = newRating;
            await this.db.ref().update(updates);
            console.log('Rating updated successfully');
        } catch (error) {
            console.error('Error updating rating:', error);
            alert('Failed to update rating: ' + error.message);
        }
    }

    viewConversation(key, conv) {
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        
        const messages = conv.messages.map(msg => `
            <div class="message ${msg.type}-message">
                <strong>${msg.type === 'user' ? 'User' : 'AI'}:</strong>
                <div class="message-content">${msg.text}</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="modal-header">
                    <h2>${conv.title || 'Untitled'}</h2>
                    <button class="close-modal">×</button>
                </div>
                <div class="conversation-meta">
                    <div>Created: ${new Date(conv.timestamp).toLocaleString()}</div>
                    <div>Wallet: ${conv.walletAddress || 'Unknown'}</div>
                    <div>Views: ${conv.views || 0}</div>
                    <div>Rating: ${conv.rating || '0'}/10</div>
                </div>
                <div class="conversation-messages">
                    ${messages}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加关闭按钮事件
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async deleteConversation(key) {
        try {
            console.log('Attempting to delete conversation with key:', key);
            if (confirm('Are you sure you want to delete this conversation?')) {
                await this.conversationsRef.child(key).remove();
                console.log('Successfully deleted conversation with key:', key);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation: ' + error.message);
        }
    }

    setupEventListeners() {
        // 创建聊天按钮
        const createChatBtn = document.getElementById('createChatBtn');
        if (createChatBtn) {
            console.log('Found create chat button');
            createChatBtn.addEventListener('click', () => {
                console.log('Create chat button clicked');
                this.showCreateChatModal();
            });
        } else {
            console.error('Create chat button not found');
        }

        // 刷新按钮
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            console.log('Found refresh button');
            refreshButton.addEventListener('click', () => {
                console.log('Refresh button clicked');
                this.refreshData();
            });
        } else {
            console.error('Refresh button not found');
        }
    }

    async refreshData() {
        try {
            // 添加刷新动画
            const refreshButton = document.getElementById('refreshButton');
            refreshButton.classList.add('refreshing');
            
            console.log('Refreshing data...');
            // 重新获取数据
            const snapshot = await this.conversationsRef.once('value');
            this.updateConversationList(snapshot);
            
            // 更新最后刷新时间
            const lastUpdateTime = document.getElementById('lastUpdateTime');
            if (lastUpdateTime) {
                lastUpdateTime.textContent = new Date().toLocaleTimeString();
            }

            // 移除刷新动画
            setTimeout(() => {
                refreshButton.classList.remove('refreshing');
            }, 1000);

            console.log('Data refresh complete');
        } catch (error) {
            console.error('Error refreshing data:', error);
            alert('Failed to refresh data: ' + error.message);
        }
    }

    showCreateChatModal() {
        console.log('Showing create chat modal');
        const modal = document.createElement('div');
        modal.className = 'admin-modal create-chat-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <h2>Create New Chat</h2>
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" id="chatTitle" placeholder="Enter chat title">
                </div>
                <div class="form-group">
                    <label>Wallet Address:</label>
                    <input type="text" id="chatWallet" placeholder="Enter wallet address">
                </div>
                <div class="messages-container">
                    <h3>Messages</h3>
                    <div id="messagesList">
                        <div class="message-input">
                            <select class="message-type">
                                <option value="user">User</option>
                                <option value="ai">AI</option>
                            </select>
                            <textarea class="message-text" placeholder="Enter message"></textarea>
                            <button class="remove-message">×</button>
                        </div>
                    </div>
                    <button type="button" class="add-message-btn" onclick="window.adminPanel.addMessageInput()">+ Add Message</button>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="cancel-btn" onclick="this.closest('.admin-modal').remove()">Cancel</button>
                    <button type="button" class="submit-btn" onclick="window.adminPanel.submitNewChat()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 添加删除消息的事件监听
        modal.querySelectorAll('.remove-message').forEach(btn => {
            btn.onclick = function() {
                if (document.querySelectorAll('.message-input').length > 1) {
                    this.closest('.message-input').remove();
                }
            };
        });
    }

    addMessageInput() {
        const messagesList = document.getElementById('messagesList');
        const newMessage = document.createElement('div');
        newMessage.className = 'message-input';
        newMessage.innerHTML = `
            <select class="message-type">
                <option value="user">User</option>
                <option value="ai">AI</option>
            </select>
            <textarea class="message-text" placeholder="Enter message"></textarea>
            <button type="button" class="remove-message">×</button>
        `;

        messagesList.appendChild(newMessage);

        // 添加删除按钮事件
        newMessage.querySelector('.remove-message').onclick = function() {
            if (document.querySelectorAll('.message-input').length > 1) {
                this.closest('.message-input').remove();
            }
        };
    }

    async submitNewChat() {
        const title = document.getElementById('chatTitle').value || 'New Chat';
        const walletAddress = document.getElementById('chatWallet').value || 'ADMIN';
        
        try {
            // 收集所有消息
            const messages = Array.from(document.querySelectorAll('.message-input')).map(input => ({
                type: input.querySelector('.message-type').value,
                text: input.querySelector('.message-text').value
            })).filter(msg => msg.text.trim());

            if (messages.length === 0) {
                alert('Please add at least one message');
                return;
            }

            const newChat = {
                title: title,
                timestamp: new Date().toISOString(),
                messages: messages,
                walletAddress: walletAddress,
                views: 0
            };

            console.log('Saving new chat:', newChat);

            // 保存到 Firebase
            const newRef = await this.conversationsRef.push({
                conversation: newChat,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            console.log('Successfully saved chat with key:', newRef.key);
            // 关闭模态框
            document.querySelector('.admin-modal')?.remove();
        } catch (error) {
            console.error('Error creating new chat:', error);
            alert('Failed to create new chat: ' + error.message);
        }
    }

    async togglePin(key, conv) {
        try {
            const updates = {};
            updates[`/conversations/${key}/conversation/isPinned`] = !conv.isPinned;
            
            await this.db.ref().update(updates);
            console.log(`Conversation ${conv.isPinned ? 'unpinned' : 'pinned'} successfully`);
            
            // 刷新数据
            this.refreshData();
        } catch (error) {
            console.error('Error toggling pin:', error);
            alert('Failed to update pin status: ' + error.message);
        }
    }
}

// 确保在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing AdminPanel...');
    window.adminPanel = new AdminPanel();
}); 