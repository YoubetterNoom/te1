const CONFIG = {
    API_ENDPOINT: 'https://api.gptsapi.net/v1/chat/completions',
    MODEL: 'gpt-3.5-turbo',
    MAX_TOKENS: 300,
    TEMPERATURE: 0.8,
    STOP_SEQUENCES: ['\n\n'],
    SYSTEM_PROMPT: `You are M78 AI...`,
    FIREBASE_CONFIG: {
        apiKey: 'AIzaSyDGWqGKVtXqGYV-506aa-Ry-nMhJWbVLQM',
        authDomain: 'martix-506aa.firebaseapp.com',
        databaseURL: 'https://martix-506aa-default-rtdb.firebaseio.com',
        projectId: 'martix-506aa'
    }
};

// 为了安全起见，移除敏感信息
if (typeof window !== 'undefined') {
    window.CONFIG = {
        ...CONFIG,
        API_KEY: undefined // 确保 API key 不会暴露在客户端
    };
} 