class StartupAnimation {
    constructor() {
        this.startupScreen = document.getElementById('startup-screen');
        this.startupText = document.getElementById('startup-text');
        this.startupLoader = document.getElementById('startup-loader');
        this.chatContainer = document.querySelector('.chat-container');
        
        this.initText = `
> INITIALIZING SYSTEM...
> CHECKING WALLET AVAILABILITY...
> LOADING KERNEL MODULES
> ESTABLISHING SECURE CONNECTION
> CONFIGURING NEURAL NETWORK
> LOADING Aether PROTOCOL
> SYSTEM CHECK: OK

> WELCOME TO THE Aether
> PLEASE CONNECT YOUR WALLET TO BEGIN...
`;
        this.charIndex = 0;
        this.lineDelay = 100;
        this.charDelay = 30;
        this.lines = this.initText.split('\n');
        document.body.classList.add('startup');
    }

    async start() {
        if (sessionStorage.getItem('skipStartup') === 'true') {
            sessionStorage.removeItem('skipStartup');
            this.skipStartup();
            return;
        }

        this.startupScreen.style.display = 'flex';
        this.startupScreen.classList.add('fade-in');
        await this.typeText();
        await this.completeStartup();
    }

    skipStartup() {
        document.body.classList.remove('startup');
        this.startupScreen.style.display = 'none';
        this.chatContainer.style.display = 'block';
        this.chatContainer.classList.add('fade-in');
        
        const Aether = new AetherBackground();
        Aether.animate();
    }

    async typeText() {
        for (let line of this.lines) {
            if (line.trim()) {
                await this.typeLine(line);
                await this.wait(this.lineDelay);
            } else {
                this.startupText.textContent += '\n';
            }
        }
    }

    async typeLine(line) {
        for (let char of line) {
            this.startupText.textContent += char;
            await this.wait(this.charDelay);
        }
        this.startupText.textContent += '\n';
    }

    async completeStartup() {
        await this.wait(1000);
        this.startupScreen.classList.add('fade-out');
        await this.wait(500);
        
        document.body.classList.remove('startup');
        this.startupScreen.style.display = 'none';
        this.chatContainer.style.display = 'block';
        this.chatContainer.classList.add('fade-in');
        
        const Aether = new AetherBackground();
        Aether.animate();
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startup = new StartupAnimation();
    startup.start();
}); 