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
let historyInitialized = false;
let isSaving = false;
let isProcessingSave = false; // 新增标志，用于跟踪整个保存流程
let isAIResponding = false;  // 标记 AI 是否正在响应
let lastMessageTime = 0;     // 记录上一次发送消息的时间
const MESSAGE_COOLDOWN = 2000; // 消息冷却时间（2秒）

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
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;

    try {
        // 添加用户消息
        appendMessage('user', message);
        userInput.value = '';

        // 检查钱包连接状态
        if (!window.walletManager?.isConnected()) {
            // 允许发送第一条消息，但随后提示连接钱包
            appendMessage('system', 'Please connect your wallet in the top right corner to continue the conversation. 👆');
            
            // 禁用输入框和发送按钮
            userInput.disabled = true;
            document.getElementById('sendButton').disabled = true;
            
            // 高亮钱包按钮
            const walletButton = document.getElementById('wallet-button');
            walletButton.classList.add('highlight-wallet');
            
            return;
        }

        // 检查是否正在响应
        if (isAIResponding) {
            console.log('AI is still responding...');
            return;
        }

        // 检查消息发送频率
        const now = Date.now();
        if (now - lastMessageTime < MESSAGE_COOLDOWN) {
            appendMessage('system', 'Please slow down! Wait a moment before sending another message.');
            return;
        }

        const sendButton = document.getElementById('sendButton');
        
        // 禁用输入和发送按钮
        userInput.disabled = true;
        sendButton.disabled = true;
        isAIResponding = true;

        // 更新发送按钮状态
        updateSendButtonState(true);
        
        // 显示加载状态
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message typing';
        typingIndicator.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
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

        // 更新最后发送消息的时间
        lastMessageTime = Date.now();

    } catch (error) {
        console.error('Error sending message:', error);
        appendMessage('system', 'Error processing message. Please try again.');
    } finally {
        // 重新启用输入和发送按钮
        userInput.disabled = false;
        sendButton.disabled = false;
        isAIResponding = false;
        updateSendButtonState(false);
        userInput.focus();
    }
}

async function callAIAPI(message) {
    try {
        console.log('Sending message to API:', message);
        
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: "system",
                        content: CONFIG.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: CONFIG.MAX_TOKENS,
                temperature: CONFIG.TEMPERATURE,
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);
        
        if (data.choices && data.choices.length > 0) {
            let reply = data.choices[0].message.content.trim();
            reply = reply.replace(/^Assistant:|^AI:|^MATRIX AI:|^M78:|^M78 AI:/, '').trim();
            return reply;
        } else {
            throw new Error('No response from API');
        }

    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// 备用 API 也使用相同的设置
async function callBackupAPI(message) {
    try {
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: "system",
                        content: CONFIG.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: CONFIG.MAX_TOKENS,
                temperature: CONFIG.TEMPERATURE
            })
        });

        if (!response.ok) {
            throw new Error(`Backup API Error: ${response.status}`);
        }

        const data = await response.json();
        let reply = data.choices[0].message.content.trim();
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
    
    // 根据消息类型添加不同的标签
    let sender = '';
    switch(type) {
        case 'user':
            sender = '👤 User';
            break;
        case 'ai':
            sender = '🤖 Infyra';
            break;
        case 'system':
            sender = '⚡ System';
            break;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="sender">${sender}</span>
            <span class="time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${text}</div>
    `;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 添加打字机效果的样式
const typewriterStyle = document.createElement('style');
typewriterStyle.textContent = `
    .ai-message {
        position: relative;
    }
    .ai-message::after {
        content: '|';
        position: absolute;
        opacity: 0;
        animation: cursor-blink 1s infinite;
    }
    @keyframes cursor-blink {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
    }
`;
document.head.appendChild(typewriterStyle);

// 删除多余的 DOMContentLoaded 监听器，只保留一个主要的
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    
    // 创建历史记录区域
    createHistorySection();
    
    // 设置其他事件监听器
    setupEventListeners();
});

// 添加事件监听器设置函数
function setupEventListeners() {
    const sendButton = document.getElementById('sendButton');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const userInput = document.getElementById('userInput');

    // 初始状态下允许输入和发送
    if (userInput) userInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    
    // 保存按钮事件监听器
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            console.log('Save button clicked');
            
            // 检查是否正在处理
            if (isProcessingSave) {
                console.log('Save in progress');
                return;
            }

            try {
                // 检查是否有对话内容
                if (currentConversation.length === 0) {
                    appendMessage('system', 'No conversation to save.');
                    return;
                }

                // 检查钱包连接
                if (!window.walletManager?.isConnected()) {
                    appendMessage('system', 'Please connect your wallet first.');
                    return;
                }

                isProcessingSave = true;
                saveButton.disabled = true; // 禁用按钮防止重复点击

                // 显示加载过程
                await showLoadingDialog([
                    'Analyzing conversation structure',
                    'Generating optimal title',
                    'Preparing data for upload',
                    'Saving to Matrix database'
                ]);

                // 调用保存函数
                await saveConversation();
                
                appendMessage('system', 'Conversation saved successfully!');
                console.log('Save operation completed');
            } catch (error) {
                console.error('Error in save operation:', error);
                appendMessage('system', 'Failed to save conversation. Please try again.');
            } finally {
                isProcessingSave = false;
                saveButton.disabled = false; // 重新启用按钮
            }
        });

        // 初始启用保存按钮
        saveButton.disabled = false;
    }

    // 设置按钮事件监听器
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', clearChat);
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
}

// 添加刷新功能
function refreshConversations() {
    console.log('Refreshing conversations...');
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.classList.add('refreshing');
    }

    // 使用新的刷新方法
    if (window.conversationManager) {
        window.conversationManager.refreshData()
            .then(() => {
                // 更新最后刷新时间
                const lastUpdateTime = document.getElementById('lastUpdateTime');
                if (lastUpdateTime) {
                    lastUpdateTime.textContent = new Date().toLocaleTimeString();
                }
            })
            .catch(error => {
                console.error('Error refreshing data:', error);
            });
    }

    // 移除刷新动画
    setTimeout(() => {
        if (refreshButton) {
            refreshButton.classList.remove('refreshing');
        }
    }, 1000);
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

// 添加自定义确认对话框函数
function showMatrixDialog(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'matrix-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'matrix-dialog';
        
        dialog.innerHTML = `
            <h3 class="matrix-dialog-title">${title}</h3>
            <div class="matrix-dialog-content">${message}</div>
            <div class="matrix-dialog-buttons">
                <button class="matrix-dialog-button confirm">Save</button>
                <button class="matrix-dialog-button cancel">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const confirmBtn = dialog.querySelector('.confirm');
        const cancelBtn = dialog.querySelector('.cancel');
        
        confirmBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
        
        // 添加键盘支持
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });
    });
}

// 添加加载对话框函数
function showLoadingDialog(steps) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'matrix-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'matrix-dialog loading-dialog';
        
        dialog.innerHTML = `
            <div class="matrix-dialog-content">
                <div class="loading-steps"></div>
                <div class="loading-animation">
                    <div class="matrix-code"></div>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const stepsContainer = dialog.querySelector('.loading-steps');
        let currentStep = 0;
        
        const defaultSteps = [
            'Connecting to Infyra network...',  // 修改这里
            'Initializing neural pathways...',
            'Processing request...',
            'Generating response...'
        ];
        
        const showStep = async () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                const stepElement = document.createElement('div');
                stepElement.className = 'loading-step';
                stepElement.innerHTML = `
                    <span class="step-text">${step}</span>
                    <div class="step-dots">
                        <span></span><span></span><span></span>
                    </div>
                `;
                stepsContainer.appendChild(stepElement);
                
                await new Promise(r => setTimeout(r, 1000)); // 每个步骤等待1秒
                currentStep++;
                showStep();
            } else {
                await new Promise(r => setTimeout(r, 500)); // 最后一步额外等待
                document.body.removeChild(overlay);
                resolve();
            }
        };
        
        showStep();
    });
}

// 修改 saveConversation 函数中的相关部分
async function saveConversation() {
    try {
        // 显示正在生成标题的提示
        appendMessage('system', 'Analyzing conversation and generating title...');

        // 构建对话内容用于生成标题
        const conversationText = currentConversation
            .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.text}`)
            .slice(-6)  // 只取最后几条消息用于生成标题
            .join('\n');

        // 生成标题
        let generatedTitle;
        try {
            const titleResponse = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are a title generator. Generate a short, concise title (2-6 words) that captures the main topic or theme of the conversation. Respond with ONLY the title, no quotes or extra text."
                        },
                        {
                            role: "user",
                            content: `Generate a title for this conversation:\n${conversationText}`
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.7
                })
            });

            if (!titleResponse.ok) {
                throw new Error('Failed to generate title');
            }

            const titleData = await titleResponse.json();
            generatedTitle = titleData.choices[0].message.content.trim();
            // 清理标题中的引号和多余空格
            generatedTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
            
            console.log('Generated title:', generatedTitle); // 添加日志

            if (!generatedTitle) {
                throw new Error('Empty title generated');
            }
        } catch (error) {
            console.error('Error generating title:', error);
            generatedTitle = 'Untitled Conversation';
        }

        // 创建对话对象
        const conversation = {
            title: generatedTitle,  // 确保使用生成的标题
            messages: currentConversation.map(msg => ({
                type: msg.type,
                text: msg.text,
                timestamp: new Date().toISOString()
            })),
            timestamp: new Date().toISOString(),
            walletAddress: window.walletManager.wallet.toString()
        };

        console.log('Saving conversation with title:', conversation.title); // 添加日志

        // 更新 Firebase
        if (window.conversationManager) {
            await window.conversationManager.saveToStorage(conversation);
            console.log('Conversation saved successfully with title:', generatedTitle); // 添加日志
        }

        return conversation;
    } catch (error) {
        console.error('Save operation failed:', error);
        throw error;
    }
}

// 添加创建历史记录区域的函数
function createHistorySection() {
    console.log('Creating history section...');
    const mainContainer = document.querySelector('.chat-container').parentElement;
    
    const historySection = document.createElement('div');
    historySection.className = 'history-grid';
    historySection.innerHTML = `
    `;
    
    mainContainer.appendChild(historySection);
    
    // 重新绑定刷新按钮事件
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshConversations);
    }

    // 初始化历史记录
    if (!historyInitialized) {
        initializeHistory();
    }
}

// 修改初始化历史记录的函数
async function initializeHistory() {
    console.log('Initializing history...');
    try {
        // 等待 ConversationManager 初始化完成
        if (!window.conversationManager?.initialized) {
            console.log('Waiting for ConversationManager initialization...');
            return new Promise(resolve => {
                window.addEventListener('conversationManagerReady', () => {
                    console.log('ConversationManager is ready');
                    updateHistoryGrid();
                    resolve();
                });
            });
        } else {
            console.log('ConversationManager already initialized');
            updateHistoryGrid();
        }
    } catch (error) {
        console.error('Error initializing history:', error);
    }
}

// 更新历史记录网格
function updateHistoryGrid(pinnedConversations = [], recentConversations = []) {
    console.log('Updating history grid...');
    
    // 更新置顶区域
    const pinnedContainer = document.querySelector('.pinned-container');
    const pinnedSection = document.querySelector('.pinned-section');
    if (pinnedContainer && pinnedSection) {
        pinnedContainer.innerHTML = '';
        if (pinnedConversations.length > 0) {
            pinnedSection.style.display = 'block';
            pinnedConversations.forEach(conv => {
                const gridItem = createGridItem(conv);
                pinnedContainer.appendChild(gridItem);
            });
        } else {
            pinnedSection.style.display = 'none';
        }
    }

    // 更新最近对话区域
    const recentContainer = document.querySelector('.recent-container');
    if (recentContainer) {
        recentContainer.innerHTML = '';
        if (recentConversations.length > 0) {
            recentConversations.forEach(conv => {
                const gridItem = createGridItem(conv);
                recentContainer.appendChild(gridItem);
            });
        } else {
            recentContainer.innerHTML = '<div class="no-data">No recent conversations</div>';
        }
    }
}

function createGridItem(conv) {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    if (conv.isPinned) {
        gridItem.classList.add('pinned');
    }

    const maskedWallet = maskWalletAddress(conv.walletAddress);
    const timestamp = new Date(conv.timestamp).toLocaleString();
    const preview = conv.messages && conv.messages.length > 0 
        ? conv.messages[0].text.substring(0, 100) + '...' 
        : 'No messages';

    gridItem.innerHTML = `
        <div class="conversation-header">
            <span class="title">
                ${conv.isPinned ? '<span class="pin-indicator">📌</span>' : ''}
                ${conv.title || 'Untitled'}
            </span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="preview">${preview}</div>
        <div class="wallet-address">${maskedWallet}</div>
        <div class="stats-container">
            <div class="views-count">
                <span class="eye-icon">👁</span>
                <span>${conv.views || 0}</span>
            </div>
            <div class="rating">
                <span class="star-icon">⭐</span>
                <span>${conv.rating || '0'}/10</span>
            </div>
        </div>
    `;

    gridItem.addEventListener('click', () => showConversation(conv));
    return gridItem;
}

// 添加钱包地址遮罩函数
function maskWalletAddress(address) {
    if (!address || address === 'Unknown') return 'Unknown';
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}***${address.substring(address.length - 4)}`;
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 更新模态框样式
const modalStyle = document.createElement('style');
modalStyle.textContent = `
.conversation-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}

.conversation-modal-content {
    background: rgba(0, 20, 0, 0.95);
    border: 2px solid #0f0;
    padding: 30px;
    width: 90%;
    max-width: 800px;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
    border-radius: 8px;
}

.conversation-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(0, 255, 0, 0.3);
}

.conversation-modal-title {
    color: #0f0;
    font-size: 1.4em;
    margin: 0;
    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.close-modal {
    background: transparent;
    border: 1px solid #0f0;
    color: #0f0;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 4px;
    font-size: 0.9em;
}

.close-modal:hover {
    background: rgba(0, 255, 0, 0.2);
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
}

.conversation-messages {
    margin: 20px 0;
    padding: 15px;
    border-radius: 6px;
    background: rgba(0, 20, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.message-pair {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    margin: 5px 0;
}

.user-message, .ai-message {
    display: flex;
    flex-direction: column;
    background: rgba(0, 100, 0, 0.2);
    padding: 12px 16px;
    border-radius: 6px;
    line-height: 1.5;
    position: relative;
}

.user-message {
    border-left: 3px solid rgba(0, 255, 0, 0.5);
    margin-right: 20px;
}

.ai-message {
    background: rgba(0, 50, 0, 0.2);
    border-right: 3px solid rgba(0, 255, 0, 0.3);
    margin-left: 20px;
}

.message-content {
    flex: 1;
    margin-bottom: 4px;
}

.message-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
}

.message-timestamp {
    font-size: 0.8em;
    color: #0f0;
    opacity: 0.6;
}

/* 移除光标闪烁动画 */
.ai-message::after {
    display: none;
}

.conversation-info {
    color: #0f0;
    font-size: 0.9em;
    margin-top: 20px;
    padding: 15px;
    background: rgba(0, 20, 0, 0.3);
    border-radius: 6px;
    display: grid;
    gap: 8px;
    opacity: 0.8;
}

.conversation-info div {
    display: flex;
    align-items: center;
    gap: 10px;
}

.conversation-info div i {
    font-size: 1.1em;
    opacity: 0.7;
}

/* 滚动条样式 */
.conversation-modal-content::-webkit-scrollbar {
    width: 8px;
}

.conversation-modal-content::-webkit-scrollbar-track {
    background: rgba(0, 20, 0, 0.3);
}

.conversation-modal-content::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 0, 0.3);
    border-radius: 4px;
}

.conversation-modal-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 0, 0.5);
}
`;
document.head.appendChild(modalStyle);

// 修改 loadConversation 函数
function loadConversation(conversation) {
    try {
        console.log('Loading conversation:', conversation);
        
        // 处理钱包地址
        const maskedWallet = maskWalletAddress(conversation.walletAddress || 'Unknown');
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'conversation-modal';
        modal.innerHTML = `
            <div class="conversation-modal-content">
                <div class="conversation-modal-header">
                    <h2 class="conversation-modal-title">${conversation.title || 'Untitled'}</h2>
                    <button class="close-modal">Close</button>
                </div>
                <div class="conversation-messages"></div>
                <div class="conversation-info">
                    <div><i>📅</i>Created: ${new Date(conversation.timestamp).toLocaleString()}</div>
                    <div><i>👤</i>Wallet: ${maskedWallet}</div>
                    <div><i>👁</i>Views: ${(conversation.views || 0) + 1}</div>
                    <div><i>⭐</i>Rating: ${conversation.rating || '0'}/10</div>
                </div>
            </div>
        `;

        // 添加消息
        const messagesContainer = modal.querySelector('.conversation-messages');
        if (conversation.messages && Array.isArray(conversation.messages)) {
            // 按照对话对创建消息
            for (let i = 0; i < conversation.messages.length; i += 2) {
                const messagePair = document.createElement('div');
                messagePair.className = 'message-pair';

                // 用户消息
                const userMsg = conversation.messages[i];
                if (userMsg) {
                    const userDiv = document.createElement('div');
                    userDiv.className = 'user-message';
                    const userText = typeof userMsg === 'object' ? userMsg.text : userMsg.replace(/^You: /, '');
                    userDiv.innerHTML = `
                        <div class="message-content">
                            <strong style="color: #0f0;">You:</strong> ${userText}
                        </div>
                        <div class="message-footer">
                            <div class="message-timestamp">${formatTimestamp(conversation.timestamp)}</div>
                        </div>
                    `;
                    messagePair.appendChild(userDiv);
                }

                // AI 回复
                const aiMsg = conversation.messages[i + 1];
                if (aiMsg) {
                    const aiDiv = document.createElement('div');
                    aiDiv.className = 'ai-message';
                    const aiText = typeof aiMsg === 'object' ? aiMsg.text : aiMsg.replace(/^AI: |^MATRIX AI: /, '');
                    aiDiv.innerHTML = `
                        <div class="message-content">
                            <strong style="color: #0f0;">MATRIX AI:</strong> ${aiText}
                        </div>
                        <div class="message-footer">
                            <div class="message-timestamp">${formatTimestamp(conversation.timestamp)}</div>
                        </div>
                    `;
                    messagePair.appendChild(aiDiv);
                }

                messagesContainer.appendChild(messagePair);
            }
        }

        // 添加关闭事件
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 添加点击外部区域关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // 添加到页面
        document.body.appendChild(modal);

        // 更新视图计数
        if (conversation.firebaseKey) {
            window.conversationManager.conversationsRef
                .child(conversation.firebaseKey)
                .child('conversation')
                .child('views')
                .set((conversation.views || 0) + 1);
        }

    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

// 确保在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, setting up history grid...');
    updateHistoryGrid();  // 这里直接调用 updateHistoryGrid
});

function showConversation(conv) {
    try {
        // 保存要查看的对话
        localStorage.setItem('viewingConversation', JSON.stringify(conv));
        // 跳转到历史页面
        window.location.href = 'history.html';
    } catch (error) {
        console.error('Error saving conversation for viewing:', error);
        alert('Unable to load conversation. Please try again.');
    }
}

function clearChat() {
    const chatBox = document.getElementById('chatBox');
    if (chatBox) {
        chatBox.innerHTML = '';
        currentConversation = [];
        appendMessage('system', 'Chat history cleared.');
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

// 更新发送按钮状态的函数
function updateSendButtonState(isResponding) {
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        if (isResponding) {
            sendButton.classList.add('disabled');
            sendButton.innerHTML = `
                <div class="button-content">
                    <span>Infyra thinking</span>  <!-- 修改这里 -->
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
        } else {
            sendButton.classList.remove('disabled');
            sendButton.textContent = 'Send';
        }
    }
} 