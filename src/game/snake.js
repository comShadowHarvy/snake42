/**
 * Snake42 AI - Snake Entity
 * Snake rendering, physics, direction handling, and power-up state management
 */

class Snake {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.direction = options.direction || { x: 1, y: 0 };
        this.nextDirection = { ...this.direction };
        
        this.body = [
            { x: this.x, y: this.y },
            { x: this.x - 1, y: this.y },
            { x: this.x - 2, y: this.y }
        ];
        
        this.isAlive = true;
        this.isPlayer = options.isPlayer || false;
        this.aiStrategy = options.aiStrategy || null;
        
        this.moveTimer = 0;
        this.baseMoveInterval = 140;
        this.moveInterval = this.baseMoveInterval;
        
        this.color = options.color || '#00d4ff';
        this.headColor = options.headColor || this.color;
        
        this.score = 0;
        this.growthPending = 0;
        this.id = options.id || `snake_${Math.random().toString(36).substr(2, 9)}`;

        // Active Power-ups
        this.shieldActive = false;
        this.speedBoostTimer = 0;
        this.doubleScoreTimer = 0;
        this.freezeTimer = 0;
    }
    
    setDirection(newDirection) {
        // Prevent 180 degree immediate reverse
        if (this.direction.x === -newDirection.x && this.direction.y === -newDirection.y) {
            return false;
        }
        this.nextDirection = { ...newDirection };
        return true;
    }

    applySpeedBoost(duration = 5000) {
        this.speedBoostTimer = duration;
    }

    applyDoubleScore(duration = 8000) {
        this.doubleScoreTimer = duration;
    }

    applyFreeze(duration = 4000) {
        this.freezeTimer = duration;
    }

    shrink(segments = 3) {
        while (this.body.length > 3 && segments > 0) {
            this.body.pop();
            segments--;
        }
    }
    
    move() {
        if (!this.isAlive) return;
        
        this.direction = { ...this.nextDirection };
        
        const newHead = {
            x: this.body[0].x + this.direction.x,
            y: this.body[0].y + this.direction.y
        };
        
        this.body.unshift(newHead);
        
        if (this.growthPending > 0) {
            this.growthPending--;
        } else {
            this.body.pop();
        }
    }
    
    grow(segments = 1) {
        this.growthPending += segments;
    }
    
    makeAIDecision(gameEngine) {
        if (this.isPlayer || !this.aiStrategy || !this.isAlive || this.freezeTimer > 0) {
            return;
        }
        
        try {
            const decision = this.aiStrategy.decide(this, gameEngine);
            if (decision) {
                this.setDirection(decision);
            }
        } catch (error) {
            console.error(`AI decision error for snake ${this.id}:`, error);
        }
    }
    
    update(deltaTime, gameEngine) {
        if (!this.isAlive) return;
        
        // Power-up timers decay
        if (this.speedBoostTimer > 0) this.speedBoostTimer -= deltaTime;
        if (this.doubleScoreTimer > 0) this.doubleScoreTimer -= deltaTime;
        if (this.freezeTimer > 0) this.freezeTimer -= deltaTime;

        // Skip move if frozen
        if (this.freezeTimer > 0) return;

        this.moveTimer += deltaTime;
        
        const speedMultiplier = (gameEngine ? (gameEngine.settings.gameSpeed / 5) : 1) * (this.speedBoostTimer > 0 ? 1.8 : 1);
        this.moveInterval = this.baseMoveInterval / speedMultiplier;
        
        if (!this.isPlayer && this.moveTimer >= this.moveInterval * 0.7) {
            this.makeAIDecision(gameEngine);
        }
        
        if (this.moveTimer >= this.moveInterval) {
            this.move();
            this.updateGameGrid(gameEngine);
            this.moveTimer = 0;
        }
    }
    
    updateGameGrid(gameEngine) {
        if (!gameEngine || !gameEngine.grid) return;
        
        this.body.forEach(segment => {
            if (gameEngine.isValidPosition(segment.x, segment.y)) {
                gameEngine.grid[segment.y][segment.x].occupied = true;
                gameEngine.grid[segment.y][segment.x].occupiedBy = this;
            }
        });
    }

    render(ctx, cellSize) {
        if (!this.isAlive) return;

        ctx.save();

        // Draw snake body segments
        this.body.forEach((seg, i) => {
            const isHead = i === 0;
            const px = seg.x * cellSize;
            const py = seg.y * cellSize;

            ctx.fillStyle = isHead ? this.headColor : this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = isHead ? 12 : 6;

            // Shield aura glow
            if (this.shieldActive && isHead) {
                ctx.strokeStyle = '#a55eea';
                ctx.lineWidth = 3;
                ctx.strokeRect(px - 2, py - 2, cellSize + 4, cellSize + 4);
            }

            // Speed boost trail visual
            if (this.speedBoostTimer > 0) {
                ctx.shadowColor = '#00d4ff';
                ctx.shadowBlur = 15;
            }

            // Freeze indicator visual
            if (this.freezeTimer > 0) {
                ctx.fillStyle = '#45cafc';
            }

            ctx.beginPath();
            ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, isHead ? 6 : 4);
            ctx.fill();

            // Head eyes
            if (isHead) {
                ctx.fillStyle = '#ffffff';
                const eyeSize = 3;
                ctx.fillRect(px + 4, py + 4, eyeSize, eyeSize);
                ctx.fillRect(px + cellSize - 7, py + 4, eyeSize, eyeSize);
            }
        });

        ctx.restore();
    }
    
    getHead() {
        return this.body[0];
    }
    
    getTail() {
        return this.body[this.body.length - 1];
    }
    
    getLength() {
        return this.body.length;
    }
    
    getScore() {
        return this.score;
    }
}

if (typeof window !== 'undefined') {
    window.Snake = Snake;
}
