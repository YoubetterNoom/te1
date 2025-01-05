class ConversationManager {
    constructor() {
        this.conversations = [];
        this.autoLoadInterval = 30000;
        this.initFirebase();
        this.init();
    }

    initFirebase() {
        // 初始化 Firebase
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        this.db = firebase.database();
        this.conversationsRef = this.db.ref('conversations');
        
        // 监听数据变化
        this.conversationsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.conversations = Object.values(data);
                localStorage.setItem('savedConversations', JSON.stringify(this.conversations));
                updateHistoryGrid(); // 更新显示
            }
        });
    }

    async saveToStorage() {
        try {
            // 保存到 Firebase
            await this.conversationsRef.set(this.conversations);
            // 同时保存到本地存储作为备份
            localStorage.setItem('savedConversations', JSON.stringify(this.conversations));
        } catch (error) {
            console.error('Error saving conversations:', error);
            // 如果 Firebase 保存失败，至少保存到本地
            localStorage.setItem('savedConversations', JSON.stringify(this.conversations));
        }
    }

    exportToFile() {
        const data = JSON.stringify(this.conversations, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversations_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importFromFile(file) {
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            // 合并对话，避免重复
            const existingIds = new Set(this.conversations.map(c => c.timestamp + c.walletAddress));
            const newConversations = imported.filter(conv => 
                !existingIds.has(conv.timestamp + conv.walletAddress)
            );
            
            this.conversations = [...newConversations, ...this.conversations];
            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Error importing conversations:', error);
            return false;
        }
    }

    addConversation(conversation) {
        this.conversations.unshift(conversation);
        this.saveToStorage();
    }

    updateConversation(index, updates) {
        this.conversations[index] = { ...this.conversations[index], ...updates };
        this.saveToStorage();
    }

    deleteConversation(index) {
        this.conversations.splice(index, 1);
        this.saveToStorage();
    }

    startAutoLoad() {
        setInterval(async () => {
            await this.loadFromStorage();
            updateHistoryGrid(); // 更新显示
        }, this.autoLoadInterval);
    }

    async checkForNewFiles() {
        try {
            const response = await fetch('/conversations');
            if (!response.ok) {
                console.log('No server connection, working in local mode');
                return;
            }
            const files = await response.json();
            
            for (const file of files) {
                if (!file.imported) {
                    try {
                        const fileResponse = await fetch(`/conversations/${file.name}`);
                        if (!fileResponse.ok) continue;
                        
                        const fileData = await fileResponse.json();
                        await this.importFromFile(new File([JSON.stringify(fileData)], file.name));
                        
                        await fetch(`/conversations/${file.name}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ imported: true })
                        });
                    } catch (error) {
                        console.error('Error processing file:', file.name, error);
                    }
                }
            }
        } catch (error) {
            // 忽略服务器连接错误，继续使用本地存储
            console.log('Working in local storage mode');
        }
    }
}

// 创建全局实例
window.conversationManager = new ConversationManager(); 