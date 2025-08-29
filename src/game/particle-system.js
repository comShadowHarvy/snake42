/**
 * Snake42 AI - Particle System
 * Visual effects for food collection, explosions, and game events
 */

class Particle {
    constructor(options = {}) {
        // Position
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Velocity
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        
        // Acceleration (for gravity effects)
        this.ax = options.ax || 0;
        this.ay = options.ay || 0;
        
        // Visual properties
        this.color = options.color || '#ffffff';
        this.size = options.size || 3;
        this.startSize = this.size;
        this.endSize = options.endSize || 0;
        
        // Lifecycle
        this.life = options.life || 1000; // Duration in ms
        this.maxLife = this.life;
        this.isAlive = true;
        
        // Fading
        this.startAlpha = options.alpha || 1;
        this.endAlpha = options.endAlpha || 0;
        this.alpha = this.startAlpha;
        
        // Animation properties
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        
        // Special effects
        this.glow = options.glow || false;
        this.trail = options.trail || false;
        this.bounce = options.bounce || false;
        this.gravity = options.gravity || 0;
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Update lifetime
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.isAlive = false;
            return;
        }
        
        // Calculate life progress (0 to 1, where 1 is start and 0 is end)
        const progress = this.life / this.maxLife;
        
        // Update position
        this.x += this.vx * (deltaTime / 16.67); // Normalize to ~60fps
        this.y += this.vy * (deltaTime / 16.67);
        
        // Apply acceleration
        this.vx += this.ax * (deltaTime / 16.67);
        this.vy += this.ay * (deltaTime / 16.67);
        
        // Apply gravity
        if (this.gravity) {
            this.vy += this.gravity * (deltaTime / 16.67);
        }
        
        // Update visual properties based on lifecycle
        this.alpha = this.startAlpha * progress + this.endAlpha * (1 - progress);
        this.size = this.startSize * progress + this.endSize * (1 - progress);
        
        // Update rotation
        this.rotation += this.rotationSpeed * (deltaTime / 16.67);
        
        // Bounce off edges if enabled
        if (this.bounce) {
            if (this.x < 0 || this.x > window.innerWidth) {
                this.vx *= -0.8; // Damping
            }
            if (this.y < 0 || this.y > window.innerHeight) {
                this.vy *= -0.8; // Damping
            }
        }
    }
    
    render(ctx) {
        if (!this.isAlive || this.alpha <= 0) return;
        
        ctx.save();
        
        // Set opacity
        ctx.globalAlpha = this.alpha;
        
        // Move to particle position
        ctx.translate(this.x, this.y);
        
        // Apply rotation if needed
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        // Draw glow effect if enabled
        if (this.glow) {
            const glowSize = this.size * 3;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, this.color + 'aa');
            gradient.addColorStop(1, this.color + '00');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw main particle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.effects = new Map();
        
        // Pre-defined effect templates
        this.defineEffects();
    }
    
    defineEffects() {
        // Food collection effect
        this.effects.set('foodCollect', {
            count: 8,
            baseConfig: {
                life: 600,
                size: 4,
                endSize: 1,
                color: '#ffe66d',
                glow: true,
                gravity: -0.2
            },
            spread: (i, count) => ({
                vx: Math.cos((i / count) * Math.PI * 2) * 2,
                vy: Math.sin((i / count) * Math.PI * 2) * 2 - 1,
                life: 600 + Math.random() * 200
            })
        });
        
        // Snake death explosion
        this.effects.set('explosion', {
            count: 12,
            baseConfig: {
                life: 800,
                size: 6,
                endSize: 0,
                color: '#ff4757',
                glow: true,
                gravity: 0.1
            },
            spread: (i, count) => ({
                vx: Math.cos((i / count) * Math.PI * 2) * 4 + (Math.random() - 0.5),
                vy: Math.sin((i / count) * Math.PI * 2) * 4 + (Math.random() - 0.5),
                life: 800 + Math.random() * 400,
                rotationSpeed: (Math.random() - 0.5) * 0.1
            })
        });
        
        // Food spawn effect
        this.effects.set('spawn', {
            count: 6,
            baseConfig: {
                life: 400,
                size: 2,
                endSize: 0,
                color: '#4ecdc4',
                glow: true
            },
            spread: (i, count) => ({
                vx: Math.cos((i / count) * Math.PI * 2) * 1,
                vy: Math.sin((i / count) * Math.PI * 2) * 1,
                life: 400 + Math.random() * 200
            })
        });
        
        // Score increase effect
        this.effects.set('score', {
            count: 5,
            baseConfig: {
                life: 500,
                size: 3,
                endSize: 0,
                color: '#00d4ff',
                glow: true,
                gravity: -0.3
            },
            spread: (i, count) => ({
                vx: (Math.random() - 0.5) * 2,
                vy: -2 - Math.random(),
                life: 500 + Math.random() * 300
            })
        });
        
        // Trail effect for moving objects
        this.effects.set('trail', {
            count: 1,
            baseConfig: {
                life: 200,
                size: 2,
                endSize: 0,
                alpha: 0.7,
                endAlpha: 0
            },
            spread: () => ({
                vx: 0,
                vy: 0
            })
        });
    }
    
    createEffect(effectName, x, y, customConfig = {}) {
        const effect = this.effects.get(effectName);
        if (!effect) {
            console.warn(`Unknown particle effect: ${effectName}`);
            return;
        }
        
        for (let i = 0; i < effect.count; i++) {
            const spreadConfig = effect.spread(i, effect.count);
            const particleConfig = {
                ...effect.baseConfig,
                ...spreadConfig,
                ...customConfig,
                x: x,
                y: y
            };
            
            this.particles.push(new Particle(particleConfig));
        }
    }
    
    // Convenience methods for common effects
    createFoodCollectEffect(position, color = '#ffe66d') {
        this.createEffect('foodCollect', position.x, position.y, { color });
    }
    
    createExplosionEffect(position, color = '#ff4757') {
        this.createEffect('explosion', position.x, position.y, { color });
    }
    
    createSpawnEffect(position, color = '#4ecdc4') {
        this.createEffect('spawn', position.x, position.y, { color });
    }
    
    createScoreEffect(position, color = '#00d4ff') {
        this.createEffect('score', position.x, position.y, { color });
    }
    
    createTrailEffect(position, color = '#ffffff', size = 2) {
        this.createEffect('trail', position.x, position.y, { color, size });
    }
    
    // Screen effects
    createScreenShake(intensity = 10, duration = 300) {
        // This would be handled by the game engine or renderer
        // For now, we'll emit an event that can be caught by the main game
        if (typeof window !== 'undefined' && window.gameEngine) {
            window.gameEngine.emit('screenShake', { intensity, duration });
        }
    }
    
    createScreenFlash(color = '#ffffff', intensity = 0.3, duration = 200) {
        // Similar to screen shake, emit an event
        if (typeof window !== 'undefined' && window.gameEngine) {
            window.gameEngine.emit('screenFlash', { color, intensity, duration });
        }
    }
    
    // Continuous effects for things like snake trails
    addContinuousTrail(snake) {
        if (!snake.isAlive) return;
        
        const head = snake.getHead();
        const worldPos = {
            x: head.x * 20 + 10, // Convert grid to world coordinates
            y: head.y * 20 + 10
        };
        
        this.createTrailEffect(worldPos, snake.headColor, 1);
    }
    
    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            // Remove dead particles
            if (!particle.isAlive) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        // Render all particles
        this.particles.forEach(particle => {
            particle.render(ctx);
        });
    }
    
    // Utility methods
    getParticleCount() {
        return this.particles.length;
    }
    
    clearAllParticles() {
        this.particles = [];
    }
    
    // Performance optimization - limit particle count
    limitParticles(maxCount = 500) {
        if (this.particles.length > maxCount) {
            // Remove oldest particles first
            const excess = this.particles.length - maxCount;
            this.particles.splice(0, excess);
        }
    }
    
    // Preset combinations for common game events
    onFoodEaten(position, snakeColor) {
        this.createFoodCollectEffect(position);
        this.createScoreEffect(position, snakeColor);
    }
    
    onSnakeDeath(position, snakeColor) {
        this.createExplosionEffect(position, snakeColor);
        this.createScreenShake(8, 200);
        this.createScreenFlash(snakeColor, 0.2, 150);
    }
    
    onFoodSpawn(position) {
        this.createSpawnEffect(position);
    }
    
    onGameStart() {
        // Create some ambient particles
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * (window.innerWidth || 800);
            const y = Math.random() * (window.innerHeight || 600);
            
            this.particles.push(new Particle({
                x, y,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 3000 + Math.random() * 2000,
                size: 1 + Math.random() * 2,
                color: '#00d4ff',
                alpha: 0.3,
                endAlpha: 0
            }));
        }
    }
    
    // Debug visualization
    renderDebugInfo(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(`Particles: ${this.particles.length}`, 10, 30);
        
        // Show particle positions as small dots
        ctx.fillStyle = '#ff0000';
        this.particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Create global particle system instance
const particleSystem = new ParticleSystem();

// Make available globally
if (typeof window !== 'undefined') {
    window.ParticleSystem = particleSystem;
    window.Particle = Particle;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParticleSystem, Particle };
}
