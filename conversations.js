class ConversationManager {
    constructor() {
        console.log('Initializing ConversationManager...');
        this.initialized = false;
        this.conversations = [];
        this.initFirebase();
        this.setupEventListeners();
        
        // 移除这个监听器，让 chat.js 处理保存
        // document.getElementById('saveButton')?.addEventListener('click', () => {
        //     this.saveConversation(currentConversation);
        // });
    }

    async initialize() {
        try {
            // 等待 DOM 加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initFirebase());
            } else {
                await this.initFirebase();
            }
        } catch (error) {
            console.error('Error initializing ConversationManager:', error);
        }
    }

    async initFirebase() {
        try {
            console.log('Starting Firebase initialization...');
            
            if (!CONFIG || !CONFIG.FIREBASE_CONFIG) {
                throw new Error('Firebase configuration is missing');
            }
            
            if (!firebase.apps.length) {
                firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
            }
            
            this.db = firebase.database();
            this.conversationsRef = this.db.ref('/conversations');
            
            // 获取初始数据
            const initialSnapshot = await this.conversationsRef.once('value');
            console.log('Initial data received:', initialSnapshot.val());
            await this.processData(initialSnapshot);
            
            // 设置实时监听
            this.conversationsRef.on('value', async (snapshot) => {
                console.log('Real-time update received:', snapshot.val());
                await this.processData(snapshot);
            });

            this.initialized = true;
            console.log('ConversationManager initialization completed');

            // 触发初始化完成事件
            window.dispatchEvent(new CustomEvent('conversationManagerReady'));
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    async processData(snapshot) {
        try {
            console.log('Processing Firebase data...');
            const data = snapshot.val();
            if (data) {
                // 转换数据格式
                const allConversations = [];
                Object.entries(data).reverse().forEach(([key, item]) => {
                    console.log('Processing item:', key, item);
                    if (item.conversation) {
                        // 确保消息格式正确
                        const messages = item.conversation.messages.map(msg => {
                            if (typeof msg === 'string') {
                                const isUser = msg.startsWith('You:');
                                return {
                                    type: isUser ? 'user' : 'ai',
                                    text: msg.replace(/^(You: |AI: )/, '')
                                };
                            }
                            return msg;
                        });

                        allConversations.push({
                            ...item.conversation,
                            messages: messages,
                            firebaseKey: key
                        });
                    }
                });
                
                // 分离置顶和普通对话
                const pinnedConversations = allConversations.filter(conv => conv.isPinned);
                const recentConversations = allConversations.filter(conv => !conv.isPinned);
                
                console.log('Processed conversations:', { pinned: pinnedConversations, recent: recentConversations });
                this.conversations = allConversations;
                
                // 更新显示
                if (typeof updateHistoryGrid === 'function') {
                    console.log('Calling updateHistoryGrid');
                    updateHistoryGrid(pinnedConversations, recentConversations);
                } else {
                    console.warn('updateHistoryGrid function not found');
                }
            } else {
                console.log('No data found in snapshot');
                this.conversations = [];
                if (typeof updateHistoryGrid === 'function') {
                    updateHistoryGrid([], []);
                }
            }
        } catch (error) {
            console.error('Error processing data:', error);
        }
    }

    async saveToStorage(conversation) {
        try {
            if (!this.initialized) {
                throw new Error('ConversationManager not initialized');
            }

            // 使用传入的 conversation 对象，保持其原有标题
            const conversationData = {
                conversation: {
                    title: conversation.title,  // 保持 AI 生成的标题
                    messages: conversation.messages,
                    timestamp: conversation.timestamp,
                    walletAddress: conversation.walletAddress,
                    views: 0,
                    rating: 0
                },
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // 保存到 Firebase
            const newRef = await this.conversationsRef.push(conversationData);
            console.log('Conversation saved with ID:', newRef.key);

            return newRef.key;
        } catch (error) {
            console.error('Error saving to storage:', error);
            throw error;
        }
    }

    async deleteConversation(firebaseKey) {
        try {
            await this.conversationsRef.child(firebaseKey).remove();
            console.log('Successfully deleted conversation');
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }

    // 添加刷新数据的方法
    async refreshData() {
        try {
            console.log('Refreshing data...');
            const snapshot = await this.conversationsRef.once('value');
            await this.processData(snapshot);
            console.log('Data refresh completed');
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    async saveConversation(conversation) {
        // 这个方法会直接保存到 Firebase，不等待 AI 生成标题
        // ... 保存逻辑 ...
    }

    // 添加 setupEventListeners 方法
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // 监听历史记录网格的刷新按钮
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                console.log('Refresh button clicked');
                this.refreshData();
            });
        }

        // 监听对话加载完成事件
        window.addEventListener('conversationManagerReady', () => {
            console.log('ConversationManager is ready');
            this.refreshData();
        });

        // 监听历史记录容器的滚动事件（如果需要）
        const historyContainer = document.querySelector('.grid-container');
        if (historyContainer) {
            historyContainer.addEventListener('scroll', () => {
                // 可以添加滚动加载更多的逻辑
                this.handleHistoryScroll(historyContainer);
            });
        }
    }

    // 添加处理历史记录滚动的方法
    handleHistoryScroll(container) {
        // 如果滚动到底部，可以加载更多历史记录
        if (container.scrollHeight - container.scrollTop === container.clientHeight) {
            console.log('Scrolled to bottom, loading more conversations...');
            // 这里可以添加加载更多历史记录的逻辑
        }
    }
}

// 创建全局实例
window.conversationManager = new ConversationManager();

// 修改全局刷新函数
window.refreshConversations = async () => {
    console.log('Manual refresh requested');
    if (window.conversationManager) {
        try {
            await window.conversationManager.refreshData();
        } catch (error) {
            console.error('Manual refresh failed:', error);
        }
    } else {
        console.error('ConversationManager not initialized');
    }
}; 