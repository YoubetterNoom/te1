window.sendMessage = sendMessage;
window.refreshConversations = refreshConversations;
window.saveConversation = saveConversation;
window.clearChat = clearChat;
window.showConversation = showConversation;

let currentConversation = [];
let savedConversations = [];
let conversationSaved = false;
const SAVE_COOLDOWN = 600000; // 10 minutes in milliseconds
let lastSaveTime = {};  // Object to store last save time for each wallet
let isConversationSubmitted = false;
let countdownTimer = null;

// Load saved conversations from localStorage
function loadSavedConversations() {
    console.log('Loading saved conversations...');
    const saved = localStorage.getItem('savedConversations');
    if (saved) {
        try {
            savedConversations = JSON.parse(saved);
            console.log('Loaded conversations:', savedConversations);
            updateHistoryGrid();
            return true;
        } catch (error) {
            console.error('Error loading conversations:', error);
            return false;
        }
    }
    return false;
}

// Save conversations to localStorage
function persistConversations() {
    localStorage.setItem('savedConversations', JSON.stringify(savedConversations));
}

function showTitleDialog() {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'title-dialog';
        dialog.innerHTML = `
            <div class="title-dialog-content">
                <h2>Name Your Conversation</h2>
                <input type="text" id="conversation-title" placeholder="Enter a title..." maxlength="50">
                <button onclick="submitTitle()">Save</button>
            </div>
        `;
        document.body.appendChild(dialog);

        // 添加回车键支持
        const titleInput = dialog.querySelector('#conversation-title');
        titleInput.focus();
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitTitle();
            }
        });

        window.submitTitle = () => {
            const title = titleInput.value.trim() || 'Untitled Conversation';
            document.body.removeChild(dialog);
            resolve(title);
        };
    });
}

async function sendMessage() {
    // 首先检查钱包连接
    if (!window.walletManager || !window.walletManager.isConnected()) {
        alert('Please connect your wallet first!');
        return;
    }

    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (message) {
        try {
            // 显示用户消息
            appendMessage('user', message);
            input.value = '';
            
            // 显示加载状态
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message ai-message typing';
            typingIndicator.textContent = 'AI is typing...';
            document.getElementById('chatBox').appendChild(typingIndicator);

            try {
                // 调用API
                const response = await callAIAPI(message);
                typingIndicator.remove();
                
                // 保存到对话历史
                currentConversation.push({ type: 'user', text: message });
                currentConversation.push({ type: 'ai', text: response });
                
                appendMessage('ai', response);
            } catch (error) {
                console.error('API Error:', error);
                typingIndicator.remove();
                appendMessage('system', 'Error: Could not get AI response. Retrying...');
                
                // 重试使用备用API
                try {
                    const backupResponse = await callBackupAPI(message);
                    currentConversation.push({ type: 'user', text: message });
                    currentConversation.push({ type: 'ai', text: backupResponse });
                    appendMessage('ai', backupResponse);
                } catch (backupError) {
                    appendMessage('system', 'All APIs failed. Please try again later.');
                }
            }
        } finally {
            input.focus();
        }
    }
}

async function callAIAPI(message) {
    try {
        console.log('Sending message to API:', message);
        
        // 构建完整的prompt
        const fullPrompt = `${CONFIG.SYSTEM_PROMPT}\n\nHuman: ${message}\nAssistant:`;
        
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
                'Cohere-Version': '2022-12-06'
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                prompt: fullPrompt,
                max_tokens: CONFIG.MAX_TOKENS,
                temperature: CONFIG.TEMPERATURE,
                stop_sequences: CONFIG.STOP_SEQUENCES,
                return_likelihoods: 'NONE',
                truncate: 'END'
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);
        
        if (data.generations && data.generations.length > 0) {
            let reply = data.generations[0].text.trim();
            
            // 清理回复中可能的提示词
            reply = reply.replace(/^Assistant:|^AI:|^MATRIX AI:/, '').trim();
            
            // 确保回复符合Matrix风格
            if (message.toLowerCase().includes('what') && message.toLowerCase().includes('name')) {
                return "I am MATRIX AI, your guide in this digital realm. How may I assist you today?";
            }
            
            return reply;
        } else {
            throw new Error('No response from API');
        }

    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// 备用API也使用相同的设置
async function callBackupAPI(message) {
    try {
        const fullPrompt = `${CONFIG.SYSTEM_PROMPT}\n\nHuman: ${message}\nAssistant:`;
        
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
                'Cohere-Version': '2022-12-06'
            },
            body: JSON.stringify({
                model: 'command-light',
                prompt: fullPrompt,
                max_tokens: 150,
                temperature: 0.7,
                stop_sequences: CONFIG.STOP_SEQUENCES
            })
        });

        if (!response.ok) {
            throw new Error(`Backup API Error: ${response.status}`);
        }

        const data = await response.json();
        let reply = data.generations[0].text.trim();
        reply = reply.replace(/^Assistant:|^AI:|^MATRIX AI:/, '').trim();
        return reply;
    } catch (error) {
        console.error('Backup API Error:', error);
        return `[System] Unable to get response. Please try again later.`;
    }
}

function appendMessage(type, text) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = type === 'user' ? `You: ${text}` : `AI: ${text}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Make sure the save button is properly bound
document.addEventListener('DOMContentLoaded', () => {
    // 初始化按钮事件监听
    const sendButton = document.getElementById('sendButton');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const refreshButton = document.getElementById('refreshButton');
    const userInput = document.getElementById('userInput');

    // 检查钱包连接状态并设置初始状态
    if (!window.walletManager || !window.walletManager.isConnected()) {
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        if (saveButton) sendButton.disabled = true;
    }

    // 使用addEventListener而不是onclick
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    if (saveButton) {
        saveButton.addEventListener('click', saveConversation);
    }
    if (clearButton) {
        clearButton.addEventListener('click', clearChat);
    }
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshConversations);
    }

    // 添加回车键发送功能
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // 加载保存的对话
    loadSavedConversations();
    
    // 设置初始刷新时间
    updateLastRefreshTime();
    
    // 启动自动刷新
    startAutoRefresh();
});

function refreshConversations() {
    const button = document.getElementById('refreshButton');
    if (button) {
        button.classList.add('refreshing');
    }
    
    try {
        // 直接从localStorage加载最新数据
        const freshData = localStorage.getItem('savedConversations');
        if (freshData) {
            const freshConversations = JSON.parse(freshData);
            
            // 检查是否有变化
            const hasChanges = JSON.stringify(savedConversations) !== JSON.stringify(freshConversations);
            
            if (hasChanges) {
                savedConversations = freshConversations;
                updateHistoryGrid();
                showRefreshMessage('Conversations updated successfully!');
            } else {
                showRefreshMessage('No new updates found');
            }
        }
        
        // Update last refresh time
        updateLastRefreshTime();
    } catch (error) {
        console.error('Refresh error:', error);
        showRefreshMessage('Error refreshing conversations');
    } finally {
        // Remove refreshing animation
        if (button) {
            setTimeout(() => {
                button.classList.remove('refreshing');
            }, 500);
        }
    }
}

function updateLastRefreshTime() {
    const timeElement = document.getElementById('lastUpdateTime');
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    timeElement.textContent = timeString;
}

function showRefreshMessage(message) {
    const existingMessage = document.querySelector('.refresh-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'refresh-message';
    messageDiv.textContent = message;
    
    // 修改消息添加位置
    const container = document.querySelector('.section-header') || document.querySelector('.history-grid');
    if (container) {
        container.appendChild(messageDiv);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// 添加自动刷新功能
function startAutoRefresh() {
    // 每30秒自动刷新一次
    setInterval(() => {
        refreshConversations();
    }, 30000);
}

async function saveConversation() {
    console.log('Attempting to save conversation...');
    
    if (!currentConversation.length) {
        alert('No conversation to save!');
        return;
    }
    
    if (conversationSaved) {
        alert('This conversation has already been saved!');
        return;
    }

    if (!window.walletManager.isConnected()) {
        alert('Please connect your wallet first!');
        return;
    }

    const walletAddress = window.walletManager.getFormattedAddress();
    const currentTime = Date.now();

    // 检查是否在冷却期
    if (lastSaveTime[walletAddress]) {
        const timeElapsed = currentTime - lastSaveTime[walletAddress];
        if (timeElapsed < SAVE_COOLDOWN) {
            showCountdownDialog(walletAddress);
            return;
        }
    }

    try {
        // 获取标题
        const title = await showTitleDialog();
        
        const timestamp = new Date().toLocaleString();
        const preview = currentConversation[0].text.substring(0, 50) + '...';
        
        // Remove any existing conversation from this wallet
        savedConversations = savedConversations.filter(conv => conv.walletAddress !== walletAddress);
        
        // Add new conversation at the beginning
        savedConversations.unshift({
            title: title,
            timestamp: timestamp,
            preview: preview,
            walletAddress: walletAddress,
            messages: [...currentConversation],
            views: 0,
            isPinned: false,
            score: null
        });

        updateHistoryGrid();
        conversationSaved = true;
        lastSaveTime[walletAddress] = currentTime;
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'message system-message';
        successMessage.textContent = 'Conversation saved successfully!';
        document.getElementById('chatBox').appendChild(successMessage);
        
        console.log('Conversation saved:', savedConversations);

        persistConversations();
        
        isConversationSubmitted = true;
        document.querySelector('.chat-container').classList.add('conversation-submitted');
        
        // 使用新的ID选择器来获取按钮
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const saveButton = document.getElementById('saveButton');
        const clearButton = document.getElementById('clearButton');

        // 禁用输入框和按钮
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        if (saveButton) saveButton.disabled = true;

        // 确保Clear按钮仍然可以点击
        if (clearButton) {
            clearButton.disabled = false;
            clearButton.style.pointerEvents = 'auto';
            clearButton.style.opacity = '1';
        }

    } catch (error) {
        console.error('Error saving conversation:', error);
        alert('Error saving conversation: ' + error.message);
    }
}

function updateHistoryGrid() {
    console.log('Updating history grid...');
    const pinnedContainer = document.querySelector('.pinned-container');
    const recentContainer = document.querySelector('.recent-container');
    
    if (!pinnedContainer || !recentContainer) {
        console.error('Could not find containers');
        return;
    }
    
    // 获取最新的对话列表
    const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
    console.log('Current conversations:', conversations);
    
    // Clear existing items
    pinnedContainer.innerHTML = '';
    recentContainer.innerHTML = '';
    
    // Separate pinned and recent conversations
    conversations.forEach((conversation, index) => {
        console.log('Processing conversation:', conversation);
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item has-content';
        
        gridItem.innerHTML = `
            <div class="title">
                ${conversation.isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                ${conversation.title || 'Untitled Conversation'}
            </div>
            <div class="meta-info">
                <span class="timestamp">${conversation.timestamp}</span>
                <span class="views">👁 ${conversation.views || 0} views</span>
                ${conversation.score !== null ? 
                    `<span class="score">⭐ ${conversation.score}/10</span>` : 
                    ''}
            </div>
            <div class="wallet-address">${conversation.walletAddress}</div>
            <div class="preview">${conversation.preview || conversation.messages[0].text}</div>
        `;
        
        gridItem.onclick = () => showConversation(index);
        
        // Add to appropriate container
        if (conversation.isPinned) {
            pinnedContainer.appendChild(gridItem);
        } else {
            recentContainer.appendChild(gridItem);
        }
    });

    // Show/hide sections based on content
    const pinnedSection = document.querySelector('.pinned-section');
    const recentSection = document.querySelector('.recent-section');
    
    if (pinnedSection && recentSection) {
        pinnedSection.style.display = pinnedContainer.children.length ? 'block' : 'none';
        recentSection.style.display = recentContainer.children.length ? 'block' : 'none';
    }
}

function showConversation(index) {
    // Instead of showing in the same page, navigate to history page with conversation ID
    localStorage.setItem('viewingConversation', JSON.stringify(savedConversations[index]));
    window.location.href = 'history.html';
}

function clearChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    currentConversation = [];
    conversationSaved = false;
    isConversationSubmitted = false;
    
    // Re-enable input and buttons using ID selectors
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const saveButton = document.getElementById('saveButton');
    
    if (userInput) userInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    if (saveButton) saveButton.disabled = false;
    
    document.querySelector('.chat-container').classList.remove('conversation-submitted');

    // Remove the pointer-events: none style
    const inputArea = document.querySelector('.input-area');
    if (inputArea) {
        inputArea.style.pointerEvents = 'auto';
        inputArea.style.opacity = '1';
    }
}

// 添加倒计时对话框样式
const style = document.createElement('style');
style.textContent = `
    .countdown-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #0f0;
        padding: 20px;
        z-index: 1000;
        color: #0f0;
        text-align: center;
        font-family: 'Courier New', monospace;
        box-shadow: 0 0 20px #0f0;
    }
    .countdown-dialog h2 {
        margin: 0 0 15px 0;
        color: #0f0;
    }
    .countdown-timer {
        font-size: 24px;
        margin: 10px 0;
        text-shadow: 0 0 5px #0f0;
    }
    .countdown-close {
        background: transparent;
        border: 1px solid #0f0;
        color: #0f0;
        padding: 5px 15px;
        cursor: pointer;
        margin-top: 15px;
    }
    .countdown-close:hover {
        background: #0f0;
        color: #000;
    }
`;
document.head.appendChild(style);

// 添加显示倒计时对话框的函数
function showCountdownDialog(walletAddress) {
    // 移除已存在的对话框
    const existingDialog = document.querySelector('.countdown-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.className = 'countdown-dialog';
    dialog.innerHTML = `
        <h2>Save Cooldown</h2>
        <div>Please wait before saving another conversation</div>
        <div class="countdown-timer"></div>
        <button class="countdown-close" onclick="this.parentElement.remove()">Close</button>
    `;
    document.body.appendChild(dialog);

    // 开始倒计时
    updateCountdown(walletAddress, dialog.querySelector('.countdown-timer'));
}

// 添加更新倒计时的函数
function updateCountdown(walletAddress, timerElement) {
    // 清除现有的倒计时
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    function updateTimer() {
        const currentTime = Date.now();
        const lastSave = lastSaveTime[walletAddress];
        const timeLeft = SAVE_COOLDOWN - (currentTime - lastSave);

        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            const dialog = document.querySelector('.countdown-dialog');
            if (dialog) {
                dialog.remove();
            }
            return;
        }

        // 转换为分:秒格式
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // 立即更新一次
    updateTimer();
    // 每秒更新一次
    countdownTimer = setInterval(updateTimer, 1000);
} 