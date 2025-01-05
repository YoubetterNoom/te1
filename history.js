function displayConversation(conversation) {
    const historyBox = document.getElementById('historyBox');
    
    // Add conversation title and metadata
    const headerDiv = document.createElement('div');
    headerDiv.className = 'conversation-header';
    headerDiv.innerHTML = `
        <h2 class="conversation-title">${conversation.title || 'Untitled Conversation'}</h2>
        <div class="conversation-metadata">
            <div class="timestamp">Saved on: ${conversation.timestamp}</div>
            <div class="wallet-address">Wallet: ${conversation.walletAddress}</div>
            <div class="views">Views: ${conversation.views || 0}</div>
            ${conversation.score !== null ? 
                `<div class="score">Score: ${conversation.score}/10</div>` : 
                ''}
        </div>
    `;
    historyBox.appendChild(headerDiv);

    // Add messages
    conversation.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}-message`;
        messageDiv.textContent = message.type === 'user' ? 
            `You: ${message.text}` : 
            `AI: ${message.text}`;
        historyBox.appendChild(messageDiv);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const historyBox = document.getElementById('historyBox');
    const conversation = JSON.parse(localStorage.getItem('viewingConversation'));
    
    // Add return button handler
    const returnButton = document.querySelector('.return-button');
    if (returnButton) {
        returnButton.onclick = (e) => {
            e.preventDefault();
            sessionStorage.setItem('skipStartup', 'true');
            window.location.href = 'index.html';
        };
    }

    if (conversation) {
        // Increment view count
        const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
        const index = conversations.findIndex(c => 
            c.timestamp === conversation.timestamp && 
            c.walletAddress === conversation.walletAddress
        );
        
        if (index !== -1) {
            conversations[index].views = (conversations[index].views || 0) + 1;
            localStorage.setItem('savedConversations', JSON.stringify(conversations));
            // Update the conversation object with new view count
            conversation.views = conversations[index].views;
        }
        
        // Display conversation
        displayConversation(conversation);
    } else {
        historyBox.innerHTML = '<div class="error-message">No conversation found.</div>';
    }
});

function loadConversation() {
    const conversation = JSON.parse(localStorage.getItem('viewingConversation'));
    if (conversation) {
        // Increment view count
        const conversations = JSON.parse(localStorage.getItem('savedConversations') || '[]');
        const index = conversations.findIndex(c => 
            c.timestamp === conversation.timestamp && 
            c.walletAddress === conversation.walletAddress
        );
        
        if (index !== -1) {
            conversations[index].views = (conversations[index].views || 0) + 1;
            localStorage.setItem('savedConversations', JSON.stringify(conversations));
        }
        
        // Display conversation
        displayConversation(conversation);
    }
} 