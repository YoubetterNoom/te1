function displayConversation(conversation) {
    const historyBox = document.getElementById('historyBox');
    
    // 处理钱包地址显示
    const maskedWallet = maskWalletAddress(conversation.walletAddress);
    
    // Add conversation title and metadata
    const headerDiv = document.createElement('div');
    headerDiv.className = 'conversation-header matrix-panel';
    headerDiv.innerHTML = `
        <h2 class="conversation-title">${conversation.title || 'Untitled Conversation'}</h2>
        <div class="conversation-metadata">
            <div class="metadata-item timestamp">
                <span class="label">Created:</span>
                <span class="value">${formatDate(conversation.timestamp)}</span>
            </div>
            <div class="metadata-item wallet">
                <span class="label">Wallet:</span>
                <span class="value">${maskedWallet}</span>
            </div>
            <div class="metadata-item views">
                <span class="label">👁 Views:</span>
                <span class="value">${conversation.views || 0}</span>
            </div>
            <div class="metadata-item rating">
                <span class="label">⭐ Rating:</span>
                <span class="value">${conversation.rating || '0'}/10</span>
            </div>
        </div>
    `;
    historyBox.appendChild(headerDiv);

    // Add messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container matrix-panel';
    
    if (conversation.messages && conversation.messages.length > 0) {
        conversation.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.type}-message`;
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-type">${message.type === 'user' ? '👤 User' : '🤖 AI'}</span>
                    <span class="message-time">${formatTime(conversation.timestamp)}</span>
                </div>
                <div class="message-content">${message.text}</div>
            `;
            messagesContainer.appendChild(messageDiv);
        });
    } else {
        const noMessagesDiv = document.createElement('div');
        noMessagesDiv.className = 'no-messages';
        noMessagesDiv.textContent = 'No messages in this conversation.';
        messagesContainer.appendChild(noMessagesDiv);
    }
    
    historyBox.appendChild(messagesContainer);
}

// 辅助函数：格式化钱包地址
function maskWalletAddress(address) {
    if (!address) return 'Unknown';
    if (address === 'ADMIN') return 'ADMIN';
    return `${address.slice(0, 4)}***${address.slice(-4)}`;
}

// 辅助函数：格式化日期
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 添加时间格式化函数
function formatTime(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const historyBox = document.getElementById('historyBox');
    
    try {
        // 安全地获取会话数据
        const savedData = localStorage.getItem('viewingConversation');
        if (!savedData) {
            throw new Error('No conversation data found');
        }

        const conversation = JSON.parse(savedData);
        if (!conversation) {
            throw new Error('Invalid conversation data');
        }

        // 更新 Firebase 中的浏览次数
        updateViewCount(conversation);
        
        // 显示对话内容
        displayConversation(conversation);

    } catch (error) {
        console.error('Error loading conversation:', error);
        historyBox.innerHTML = `
            <div class="error-message">
                <h3>Unable to load conversation</h3>
                <p>${error.message}</p>
                <button onclick="window.location.href='index.html'" class="return-button">
                    Return to Matrix
                </button>
            </div>
        `;
    }

    // 添加返回按钮事件
    const returnButton = document.querySelector('.return-button');
    if (returnButton) {
        returnButton.onclick = (e) => {
            e.preventDefault();
            sessionStorage.setItem('skipStartup', 'true');
            window.location.href = 'index.html';
        };
    }
});

// 更新浏览次数的函数
async function updateViewCount(conversation) {
    try {
        // 初始化 Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        }
        const db = firebase.database();

        // 查找对应的对话记录
        const conversationsRef = db.ref('/conversations');
        const snapshot = await conversationsRef.once('value');
        const allConversations = snapshot.val();

        // 查找匹配的对话
        let targetKey = null;
        for (const [key, value] of Object.entries(allConversations)) {
            if (value.conversation.timestamp === conversation.timestamp &&
                value.conversation.walletAddress === conversation.walletAddress) {
                targetKey = key;
                break;
            }
        }

        if (targetKey) {
            // 更新浏览次数
            const currentViews = (allConversations[targetKey].conversation.views || 0) + 1;
            await conversationsRef.child(targetKey).child('conversation').update({
                views: currentViews
            });
            
            // 更新本地显示
            conversation.views = currentViews;
            localStorage.setItem('viewingConversation', JSON.stringify(conversation));
            
            // 更新显示的浏览次数
            const viewsElement = document.querySelector('.metadata-item.views .value');
            if (viewsElement) {
                viewsElement.textContent = currentViews;
            }
            
            console.log('Views updated successfully:', currentViews);
        }
    } catch (error) {
        console.error('Error updating view count:', error);
    }
} 