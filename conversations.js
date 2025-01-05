class ConversationManager {
    constructor() {
        this.conversations = [];
        this.autoLoadInterval = 30000;
        this.initFirebase();
    }

    initFirebase() {
        try {
            console.log('Starting Firebase initialization...');
            
            // 检查配置是否存在
            if (!CONFIG || !CONFIG.FIREBASE_CONFIG) {
                throw new Error('Firebase configuration is missing');
            }
            
            console.log('Firebase config:', CONFIG.FIREBASE_CONFIG);
            
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
                console.log('Firebase app initialized');
            }
            
            this.db = firebase.database();
            console.log('Firebase database initialized');
            
            // 设置数据引用
            this.conversationsRef = this.db.ref('/conversations');
            console.log('Conversations reference created');

            // 测试写入一些数据
            this.testInitialData();
            
            // 监听数据变化
            this.conversationsRef.on('value', (snapshot) => {
                console.log('Received data from Firebase:', snapshot.val());
                const data = snapshot.val();
                if (data) {
                    // 转换数据格式
                    const allConversations = [];
                    Object.values(data).forEach(item => {
                        if (item.conversations && Array.isArray(item.conversations)) {
                            allConversations.push(...item.conversations);
                        }
                    });
                    
                    console.log('Processed conversations:', allConversations);
                    this.conversations = allConversations;
                    localStorage.setItem('savedConversations', JSON.stringify(allConversations));
                    
                    // 更新显示
                    if (typeof updateHistoryGrid === 'function') {
                        updateHistoryGrid();
                    }
                }
            });
            
            // 加载本地数据
            const savedData = localStorage.getItem('savedConversations');
            if (savedData) {
                this.conversations = JSON.parse(savedData);
                if (typeof updateHistoryGrid === 'function') {
                    updateHistoryGrid();
                }
            }
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    async testInitialData() {
        try {
            // 检查是否已有数据
            const snapshot = await this.conversationsRef.once('value');
            if (!snapshot.val()) {
                console.log('No existing data, creating test data...');
                // 创建测试数据
                await this.conversationsRef.push({
                    conversations: [{
                        title: 'Test Conversation',
                        timestamp: new Date().toISOString(),
                        messages: [
                            { type: 'user', text: 'Hello Matrix!' },
                            { type: 'ai', text: 'Welcome to the Matrix!' }
                        ]
                    }],
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    lastUpdate: new Date().toISOString()
                });
                console.log('Test data created successfully');
            }
        } catch (error) {
            console.error('Error creating test data:', error);
        }
    }

    async saveToStorage() {
        try {
            console.log('Attempting to save to Firebase:', this.conversations);
            
            // 创建一个新的引用，使用push()生成唯一ID
            const newConversationRef = this.conversationsRef.push();
            
            // 保存到 Firebase
            await newConversationRef.set({
                conversations: this.conversations,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                lastUpdate: new Date().toISOString()
            });
            
            console.log('Successfully saved to Firebase');
            
            // 同时保存到本地存储作为备份
            localStorage.setItem('savedConversations', JSON.stringify(this.conversations));
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            console.error('Error details:', error.message);
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

// 确保在页面完全加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing ConversationManager...');
    window.conversationManager = new ConversationManager();
}); 