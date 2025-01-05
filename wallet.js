class WalletManager {
    constructor() {
        this.connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));
        this.wallet = null;
        this.walletButton = document.getElementById('wallet-button');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.querySelector('.input-area button');
    }

    async connectWallet() {
        try {
            // Check if Phantom is installed
            const isPhantomInstalled = window.solana && window.solana.isPhantom;
            
            if (!isPhantomInstalled) {
                alert('Please install Phantom wallet!');
                window.open('https://phantom.app/', '_blank');
                return;
            }

            // Request connection to Phantom
            const provider = window.solana;
            await provider.connect({ onlyIfTrusted: false });
            
            this.wallet = provider.publicKey;
            
            // Format wallet address with stars
            const formattedAddress = this.getFormattedAddress();
            
            // Update UI
            this.walletButton.textContent = `Connected: ${formattedAddress}`;
            this.walletButton.classList.add('connected');
            
            // Enable chat
            this.userInput.disabled = false;
            this.sendButton.disabled = false;

            return true;
        } catch (err) {
            console.error('Error connecting wallet:', err);
            alert('Failed to connect wallet!');
            return false;
        }
    }

    getFormattedAddress() {
        if (!this.wallet) return 'Not Connected';
        const address = this.wallet.toString();
        return `${address.slice(0, 4)}****${address.slice(-4)}`;
    }

    isConnected() {
        return this.wallet !== null;
    }
}

// Create a global instance
window.walletManager = new WalletManager();

async function connectWallet() {
    await window.walletManager.connectWallet();
} 