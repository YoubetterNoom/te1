const ADMIN_PASSWORD = '123456'; // 在实际应用中应该使用更安全的方式存储密码

function verifyPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadConversations();
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
    const newChat = {
        title: 'Admin Created Chat',
        timestamp: new Date().toLocaleString(),
        walletAddress: 'ADMIN',
        messages: [
            { type: 'ai', text: 'This is an admin-created conversation.' }
        ],
        views: 0,
        score: null,
        isPinned: false,
        preview: 'This is an admin-created conversation.'
    };

    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    conversations.unshift(newChat);
    localStorage.setItem('savedConversations', JSON.stringify(conversations));
    
    loadConversations();
    
    alert('New conversation created successfully!');
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