class OnlineCounter {
    constructor() {
        this.baseCount = 100;  // 基础人数100
        this.minCount = 80;    // 最小人数80
        this.maxCount = 150;   // 最大人数150
        this.updateInterval = 10000; // 10秒更新一次
        this.currentCount = this.generateCount(); // 保存当前人数
        this.intervalId = null;
        this.start();
    }

    generateCount() {
        // 生成与当前人数相近的随机数，最大变化幅度为±5
        const variation = Math.floor(Math.random() * 11) - 5; // -5到+5的随机数
        let newCount = (this.currentCount || 100) + variation;
        
        // 确保人数在允许范围内
        newCount = Math.max(this.minCount, Math.min(this.maxCount, newCount));
        
        return newCount;
    }

    updateDisplay() {
        const countElement = document.getElementById('online-count');
        if (countElement) {
            this.currentCount = this.generateCount();
            countElement.textContent = this.currentCount;
        }
    }

    start() {
        if (document.getElementById('online-count')) {
            this.updateDisplay();
            this.intervalId = setInterval(() => this.updateDisplay(), this.updateInterval);
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// Global instance
window.onlineCounter = new OnlineCounter();

// Start counter when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.onlineCounter.start();
}); 