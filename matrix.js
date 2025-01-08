class AetherBackground {
    constructor() {
        this.canvas = document.getElementById('Aether');
        this.ctx = this.canvas.getContext('2d');
        this.chars = "日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789:・.";
        this.fontSize = 16;
        this.columns = 0;
        this.drops = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.speed = 0.5;
        
        this.initialize();
        window.addEventListener('resize', () => this.initialize());
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
    }

    initialize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = new Array(this.columns).fill(0);
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.drops.length; i++) {
            const x = i * this.fontSize;
            const y = this.drops[i] * this.fontSize;
            
            const dx = this.mouseX - x;
            const dy = this.mouseY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const disturbance = distance < 100 ? Math.sin(distance * 0.05) * 5 : 0;
            
            const text = this.chars[Math.floor(Math.random() * this.chars.length)];
            
            const brightness = distance < 100 
                ? 255 
                : Math.max(50, Math.random() * 200);
            
            this.ctx.fillStyle = `rgba(0, ${brightness}, 0, 0.8)`;
            this.ctx.font = `${this.fontSize + disturbance}px monospace`;
            
            this.ctx.fillText(text, x + disturbance, y);
            
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.98) {
                this.drops[i] = 0;
            } else {
                this.drops[i] += this.speed;
            }
        }
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}