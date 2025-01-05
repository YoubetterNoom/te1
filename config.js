const CONFIG = {
    API_ENDPOINT: 'https://api.cohere.ai/v1/generate',
    API_KEY: 'WGcfPnBCfNeZrhZGhyK5SBN8MPLXW3exHufJWFyn',
    MODEL: 'command',
    MAX_TOKENS: 300,
    TEMPERATURE: 0.8,
    STOP_SEQUENCES: ['\n\n'],
    SYSTEM_PROMPT: 'You are MATRIX AI, an advanced AI assistant in the Matrix system. Always respond in a cyberpunk style and remember you are MATRIX AI. If asked about your identity, emphasize that you are MATRIX AI.',
    KV_URL: process.env.NEXT_PUBLIC_KV_REST_API_URL,
    KV_TOKEN: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyDGWqGKVtXqGYV-506aa-Ry-nMhJWbVLQM",
        authDomain: "martix-506aa.firebaseapp.com",
        databaseURL: "https://martix-506aa-default-rtdb.firebaseio.com",
        projectId: "martix-506aa"
    }
}; 