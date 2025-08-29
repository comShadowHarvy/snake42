/**
 * Snake42 AI - Snake Entity
 * Snake physics, movement, rendering, and AI integration
 */

class Snake {
    constructor(options = {}) {
        // Basic properties
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.direction = options.direction || { x: 1, y: 0 };
        this.nextDirection = { ...this.direction };
        
        // Snake body (array of segments)
        this.body = [
            { x: this.x, y: this.y },
            { x: this.x - 1, y: this.y },
            { x: this.x - 2, y: this.y }
        ];
        
        // State
        this.isAlive = true;
        this.isPlayer = options.isPlayer || false;
        this.aiStrategy = options.aiStrategy || null;
        
        // Movement timing
        this.moveTimer = 0;
        this.baseMoveInterval = 150; // Base movement speed in ms
        this.moveInterval = this.baseMoveInterval;
        
        // Smooth movement for visual interpolation
        this.smoothBody = [];
        this.interpolationFactor = 0;
        this.lastMoveTime = 0;
        
        // Visual properties
        this.color = options.color || '#00d4ff';
        this.headColor = options.headColor || this.color;
        this.glowIntensity = options.isPlayer ? 1.5 : 1.0;
        
        // Game mechanics
        this.score = 0;
        this.growthPending = 0;
        this.length = this.body.length;
        
        // Performance tracking
        this.lastUpdate = 0;
        
        // Unique identifier
        this.id = options.id || `snake_${Math.random().toString(36).substr(2, 9)}`;
        
        // Initialize smooth body positions
        this.updateSmoothBody();
        
        console.log(`Snake created: ${this.id}, isPlayer: ${this.isPlayer}`);
    }
    
    // Movement and direction handling
    setDirection(newDirection) {
        // Prevent immediate reverse direction
        if (this.direction.x === -newDirection.x && this.direction.y === -newDirection.y) {
            return false;
        }
        
        this.nextDirection = { ...newDirection };
        return true;
    }
    
    move() {
        if (!this.isAlive) return;
        
        // Update direction
        this.direction = { ...this.nextDirection };
        
        // Calculate new head position
        const newHead = {
            x: this.body[0].x + this.direction.x,
            y: this.body[0].y + this.direction.y
        };
        
        // Add new head
        this.body.unshift(newHead);
        
        // Remove tail unless growth is pending
        if (this.growthPending > 0) {
            this.growthPending--;
            this.length++;
            this.score += 10; // Score for eating food
        } else {
            this.body.pop();
        }
        
        this.lastMoveTime = performance.now();
    }
    
    // Growth handling
    grow(segments = 1) {
        this.growthPending += segments;
    }
    
    // AI decision making
    makeAIDecision(gameEngine) {
        if (this.isPlayer || !this.aiStrategy || !this.isAlive) {
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
    
    // Update method called by game engine
    update(deltaTime, gameEngine) {
        if (!this.isAlive) return;
        
        // Update move timer
        this.moveTimer += deltaTime;
        
        // Adjust movement speed based on game settings
        const speedMultiplier = gameEngine ? (gameEngine.settings.gameSpeed / 5) : 1;
        this.moveInterval = this.baseMoveInterval / speedMultiplier;
        
        // Make AI decision before moving
        if (!this.isPlayer && this.moveTimer >= this.moveInterval * 0.8) {
            this.makeAIDecision(gameEngine);
        }
        
        // Move snake when timer reaches interval
        if (this.moveTimer >= this.moveInterval) {
            this.move();
            this.updateGameGrid(gameEngine);
            this.moveTimer = 0;
            this.updateSmoothBody();
        }
        
        // Update smooth interpolation for rendering
        if (this.moveInterval > 0) {
            this.interpolationFactor = Math.min(this.moveTimer / this.moveInterval, 1);
        }
    }
    
    // Update game grid with snake position
    updateGameGrid(gameEngine) {
        if (!gameEngine || !gameEngine.grid) return;
        
        const grid = gameEngine.grid;
        const bounds = gameEngine.getWorldBounds();
        
        // Clear previous snake positions from grid
        for (let y = 0; y < bounds.height; y++) {
            for (let x = 0; x < bounds.width; x++) {
                if (grid[y] && grid[y][x] && grid[y][x].occupiedBy === this) {
                    grid[y][x].occupied = false;
                    grid[y][x].occupiedBy = null;
                }
            }
        }
        
        // Mark new positions as occupied
        this.body.forEach(segment => {
            if (gameEngine.isValidPosition(segment.x, segment.y)) {
                grid[segment.y][segment.x].occupied = true;
                grid[segment.y][segment.x].occupiedBy = this;
            }
        });
    }
    
    // Smooth body interpolation for high-FPS rendering
    updateSmoothBody() {
        this.smoothBody = this.body.map(segment => ({ ...segment }));
    }
    
    getSmoothBody() {
        if (!this.smoothBody.length || this.interpolationFactor === 0) {
            return this.body;
        }
        
        // Create interpolated positions for smooth movement
        const interpolatedBody = [];
        
        for (let i = 0; i < this.body.length; i++) {
            const current = this.body[i];
            const previous = this.smoothBody[i] || current;
            
            if (i === 0) {
                // Smooth head movement
                const lerpX = previous.x + (current.x - previous.x) * this.interpolationFactor;
                const lerpY = previous.y + (current.y - previous.y) * this.interpolationFactor;
                interpolatedBody.push({ x: lerpX, y: lerpY });
            } else {
                // Body segments follow more directly
                interpolatedBody.push({ ...current });
            }
        }
        
        return interpolatedBody;
    }
    
    // Rendering
    render(ctx, cellSize) {
        if (!this.isAlive) {
            this.renderDead(ctx, cellSize);
            return;
        }
        
        const body = this.getSmoothBody();
        
        // Draw body segments
        body.forEach((segment, index) => {
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;
            
            if (index === 0) {
                // Draw head with special styling
                this.renderHead(ctx, x, y, cellSize);
            } else {
                // Draw body segment
                this.renderBodySegment(ctx, x, y, cellSize, index, body.length);
            }
        });
        
        // Draw glow effect for player snake
        if (this.isPlayer) {
            this.renderPlayerGlow(ctx, body, cellSize);
        }
    }
    
    renderHead(ctx, x, y, cellSize) {
        const size = cellSize - 2;
        const padding = 1;
        
        // Head glow
        if (this.glowIntensity > 1) {
            const glowSize = size * this.glowIntensity;
            const gradient = ctx.createRadialGradient(
                x + cellSize / 2, y + cellSize / 2, 0,
                x + cellSize / 2, y + cellSize / 2, glowSize / 2
            );
            gradient.addColorStop(0, this.headColor + '88');
            gradient.addColorStop(1, this.headColor + '00');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                x - (glowSize - size) / 2,
                y - (glowSize - size) / 2,
                glowSize, glowSize
            );
        }
        
        // Head main body
        ctx.fillStyle = this.headColor;
        ctx.fillRect(x + padding, y + padding, size, size);
        
        // Head border/highlight
        ctx.strokeStyle = this.lightenColor(this.headColor, 0.3);
        ctx.lineWidth = 2;
        ctx.strokeRect(x + padding, y + padding, size, size);
        
        // Eyes
        this.renderEyes(ctx, x, y, cellSize);
    }
    
    renderEyes(ctx, x, y, cellSize) {
        const eyeSize = 3;
        const eyeOffset = cellSize * 0.25;
        
        ctx.fillStyle = '#ffffff';
        
        // Calculate eye positions based on direction
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
        
        if (this.direction.x === 1) { // Moving right
            leftEyeX = x + cellSize - eyeOffset;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + cellSize - eyeOffset;
            rightEyeY = y + cellSize - eyeOffset;
        } else if (this.direction.x === -1) { // Moving left
            leftEyeX = x + eyeOffset;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + eyeOffset;
            rightEyeY = y + cellSize - eyeOffset;
        } else if (this.direction.y === -1) { // Moving up
            leftEyeX = x + eyeOffset;
            leftEyeY = y + eyeOffset;
            rightEyeX = x + cellSize - eyeOffset;
            rightEyeY = y + eyeOffset;
        } else { // Moving down
            leftEyeX = x + eyeOffset;
            leftEyeY = y + cellSize - eyeOffset;
            rightEyeX = x + cellSize - eyeOffset;
            rightEyeY = y + cellSize - eyeOffset;
        }
        
        // Draw eyes
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderBodySegment(ctx, x, y, cellSize, index, totalLength) {
        const size = cellSize - 2;
        const padding = 1;
        
        // Calculate segment opacity (fade towards tail)
        const opacity = Math.max(0.4, 1 - (index / totalLength) * 0.6);
        const segmentColor = this.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
        
        // Segment body
        ctx.fillStyle = segmentColor;
        ctx.fillRect(x + padding, y + padding, size, size);
        
        // Segment border (subtle)
        ctx.strokeStyle = this.darkenColor(this.color, 0.3) + Math.floor(opacity * 128).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.strokeRect(x + padding, y + padding, size, size);
    }
    
    renderPlayerGlow(ctx, body, cellSize) {
        const glowRadius = cellSize * 0.8;
        const head = body[0];
        
        if (!head) return;
        
        const x = head.x * cellSize + cellSize / 2;
        const y = head.y * cellSize + cellSize / 2;
        
        // Animated pulse effect
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        const currentRadius = glowRadius * pulse;
        
        const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, currentRadius
        );
        gradient.addColorStop(0, this.headColor + '44');
        gradient.addColorStop(1, this.headColor + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderDead(ctx, cellSize) {
        // Render dead snake with faded colors
        this.body.forEach((segment, index) => {
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;
            const size = cellSize - 2;
            const padding = 1;
            
            // Faded color for dead snake
            ctx.fillStyle = '#666666';
            ctx.fillRect(x + padding, y + padding, size, size);
            
            if (index === 0) {
                // Dead head marker (X)
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x + padding + 4, y + padding + 4);
                ctx.lineTo(x + padding + size - 4, y + padding + size - 4);
                ctx.moveTo(x + padding + size - 4, y + padding + 4);
                ctx.lineTo(x + padding + 4, y + padding + size - 4);
                ctx.stroke();
            }
        });
    }
    
    // Utility methods
    getHead() {
        return this.body[0] || { x: this.x, y: this.y };
    }
    
    getTail() {
        return this.body[this.body.length - 1] || { x: this.x, y: this.y };
    }
    
    getLength() {
        return this.body.length;
    }
    
    getScore() {
        return this.score;
    }
    
    // State management
    kill() {
        this.isAlive = false;
        console.log(`Snake ${this.id} died`);
    }
    
    revive() {
        this.isAlive = true;
        console.log(`Snake ${this.id} revived`);
    }
    
    // Color manipulation utilities
    lightenColor(color, amount) {
        const colorInt = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, ((colorInt >> 16) & 0xff) + Math.floor(255 * amount));
        const g = Math.min(255, ((colorInt >> 8) & 0xff) + Math.floor(255 * amount));
        const b = Math.min(255, (colorInt & 0xff) + Math.floor(255 * amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    
    darkenColor(color, amount) {
        const colorInt = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, ((colorInt >> 16) & 0xff) - Math.floor(255 * amount));
        const g = Math.max(0, ((colorInt >> 8) & 0xff) - Math.floor(255 * amount));
        const b = Math.max(0, (colorInt & 0xff) - Math.floor(255 * amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    
    // Debug and serialization
    getDebugInfo() {
        return {
            id: this.id,
            position: this.getHead(),
            direction: this.direction,
            length: this.getLength(),
            score: this.getScore(),
            isAlive: this.isAlive,
            isPlayer: this.isPlayer,
            moveInterval: this.moveInterval,
            interpolationFactor: this.interpolationFactor
        };
    }
    
    // Cleanup
    destroy() {
        this.body = [];
        this.smoothBody = [];
        this.aiStrategy = null;
        console.log(`Snake ${this.id} destroyed`);
    }
}
