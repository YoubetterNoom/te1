const CONFIG = {
    API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://api.gptsapi.net/v1/chat/completions',
    MODEL: process.env.NEXT_PUBLIC_MODEL || 'gpt-3.5-turbo',
    MAX_TOKENS: parseInt(process.env.NEXT_PUBLIC_MAX_TOKENS || '300'),
    TEMPERATURE: parseFloat(process.env.NEXT_PUBLIC_TEMPERATURE || '0.8'),
    STOP_SEQUENCES: ['\n\n'],
    SYSTEM_PROMPT: process.env.NEXT_PUBLIC_SYSTEM_PROMPT || `You are M78 AI...`,
    FIREBASE_CONFIG: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    }
};

// 确保在浏览器端也能访问
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

export default CONFIG; 