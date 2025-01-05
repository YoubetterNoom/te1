class ConversationManager {
    constructor() {
        this.conversations = [];
        this.initFirebase();
    }

    initFirebase() {
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
            
            // 监听数据变化
            this.conversationsRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // 转换数据格式
                    const allConversations = [];
                    Object.entries(data).forEach(([key, item]) => {
                        if (item.conversation) {
                            allConversations.unshift({
                                ...item.conversation,
                                firebaseKey: key // 保存 Firebase key 用于删除
                            });
                        }
                    });
                    
                    this.conversations = allConversations;
                    if (typeof updateHistoryGrid === 'function') {
                        updateHistoryGrid();
                    }
                }
            });
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    async saveToStorage() {
        try {
            const currentConversation = this.conversations[0];
            if (!currentConversation) {
                console.error('No conversation to save');
                return;
            }

            await this.conversationsRef.push({
                conversation: currentConversation,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            console.log('Successfully saved to Firebase');
        } catch (error) {
            console.error('Error saving to Firebase:', error);
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
} 