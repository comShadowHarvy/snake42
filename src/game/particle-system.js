/**
 * Snake42 AI - Upgraded Particle System
 * Visual effects for food collection, power-up pickups, explosions, and trail effects
 */

class Particle {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        
        this.color = options.color || '#ffffff';
        this.size = options.size || Math.random() * 4 + 2;
        this.startSize = this.size;
        this.endSize = options.endSize || 0;
        
        this.life = options.life || 600;
        this.maxLife = this.life;
        this.isAlive = true;
        
        this.startAlpha = options.alpha || 1;
        this.alpha = this.startAlpha;
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.isAlive = false;
            return;
        }
        
        const progress = this.life / this.maxLife;
        this.x += this.vx;
        this.y += this.vy;
        
        this.alpha = this.startAlpha * progress;
        this.size = this.startSize * progress;
    }
    
    render(ctx) {
        if (!this.isAlive || this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystemManager {
    constructor() {
        this.particles = [];
    }

    onFoodEaten(pos, color = '#ffe66d') {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push(new Particle({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                life: 500
            }));
        }
    }

    onPowerUpCollected(pos, type) {
        const colors = { speed: '#00d4ff', shield: '#a55eea', shrink: '#2ed573', double: '#ffe66d', freeze: '#45cafc' };
        const color = colors[type] || '#ffffff';
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push(new Particle({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 5,
                life: 700
            }));
        }
    }

    onSnakeDeath(pos, color = '#ff4757') {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 1;
            this.particles.push(new Particle({
                x: pos.x,
                y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 6,
                life: 900
            }));
        }
    }
}

window.ParticleSystem = new ParticleSystemManager();
window.Particle = Particle;
