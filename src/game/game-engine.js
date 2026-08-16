/**
 * Snake42 AI - Upgraded Game Engine
 * Handles core game loop, power-ups, audio integration, combos, and collision logic
 */

class GameEngine {
    constructor(canvas, settings = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.settings = {
            gridSize: 25,
            gameSpeed: 5,
            aiCount: 4,
            aiDifficulty: 'medium',
            soundEnabled: true,
            particlesEnabled: true,
            ...settings
        };
        
        this.state = 'MENU';
        this.isRunning = false;
        this.isPaused = false;
        
        this.updateWorldDimensions();
        
        this.snakes = [];
        this.food = [];
        this.powerUps = [];
        this.particles = [];
        
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        this.targetFPS = 60;
        
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        this.eventListeners = {};
        
        this.grid = [];
        this.initializeGrid();
        
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        this.setupCanvas();
        this.bindEvents();

        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        
        console.log('GameEngine initialized with settings:', this.settings);
    }
    
    updateWorldDimensions() {
        const cellSize = 20;
        this.cellSize = cellSize;
        
        this.worldWidth = Math.floor(this.canvas.width / cellSize);
        this.worldHeight = Math.floor(this.canvas.height / cellSize);
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        } else {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
        
        this.ctx.imageSmoothingEnabled = true;
        this.updateWorldDimensions();
    }
    
    bindEvents() {
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.setupCanvas();
            this.initializeGrid();
        }, 100);
    }
    
    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.worldHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.worldWidth; x++) {
                this.grid[y][x] = {
                    x: x,
                    y: y,
                    occupied: false,
                    occupiedBy: null,
                    isFood: false,
                    isPowerUp: false,
                    powerUpType: null
                };
            }
        }
    }
    
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    emit(event, data = {}) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => {
                try { cb(data); } catch (e) { console.error(e); }
            });
        }
    }
    
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChanged', { oldState, newState });
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.setState('PLAYING');
        this.lastTime = performance.now();
        this.gameLoop();
        this.emit('gameStarted');
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        this.setState(this.isPaused ? 'PAUSED' : 'PLAYING');
        if (!this.isPaused) this.lastTime = performance.now();
        this.emit('gamePaused', { isPaused: this.isPaused });
    }
    
    stop() {
        this.isRunning = false;
        this.setState('GAME_OVER');
        this.emit('gameStopped');
    }
    
    reset() {
        this.snakes = [];
        this.food = [];
        this.powerUps = [];
        this.particles = [];
        this.gameTime = 0;
        this.lastTime = 0;
        this.combo = 0;
        this.initializeGrid();
        this.emit('gameReset');
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updateFPS(currentTime);
        
        if (!this.isPaused) {
            this.gameTime += this.deltaTime;
            this.update(this.deltaTime);
        }
        
        this.render();
        requestAnimationFrame(this.gameLoop);
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            this.emit('fpsUpdated', { fps: this.fps });
        }
    }
    
    update(deltaTime) {
        // Combo timeout decay
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Update snakes
        this.snakes.forEach((snake) => {
            if (snake.isAlive) {
                snake.update(deltaTime, this);
            }
        });
        
        // Update particles
        this.particles = this.particles.filter(p => {
            p.update(deltaTime);
            return p.isAlive;
        });
        
        this.checkCollisions();
        this.manageFoodSpawning();
        this.managePowerUpSpawning();
        this.checkGameOver();
    }
    
    checkCollisions() {
        this.snakes.forEach(snake => {
            if (!snake.isAlive) return;
            
            const head = snake.getHead();
            if (!this.isValidPosition(head.x, head.y)) {
                if (snake.shieldActive) {
                    snake.shieldActive = false;
                    this.bounceSnake(snake);
                } else {
                    this.handleSnakeDeath(snake, 'wall');
                }
                return;
            }
            
            const cell = this.grid[head.y][head.x];
            
            // Food collision
            if (cell.isFood) {
                this.handleFoodEaten(snake, head);
            }
            
            // Power-up collision
            if (cell.isPowerUp) {
                this.handlePowerUpCollected(snake, head, cell.powerUpType);
            }
            
            // Snake body collision
            if (cell.occupied && cell.occupiedBy !== snake) {
                if (snake.shieldActive) {
                    snake.shieldActive = false;
                    this.bounceSnake(snake);
                } else {
                    this.handleSnakeDeath(snake, 'snake');
                }
            }
        });
    }

    bounceSnake(snake) {
        // Reverse direction on shield bump
        snake.direction = { x: -snake.direction.x, y: -snake.direction.y };
        snake.nextDirection = { ...snake.direction };
        if (window.soundEngine) window.soundEngine.playPowerUpSound();
    }
    
    handleFoodEaten(snake, position) {
        const foodIdx = this.food.findIndex(f => f.x === position.x && f.y === position.y);
        if (foodIdx >= 0) this.food.splice(foodIdx, 1);
        
        this.grid[position.y][position.x].isFood = false;
        
        // Combo multiplier
        if (snake.isPlayer) {
            this.combo++;
            this.comboTimer = 3000; // 3 seconds to keep combo
            if (window.soundEngine) window.soundEngine.playEatSound(false);
        }

        const scoreBonus = 10 * (snake.doubleScoreActive ? 2 : 1) * (snake.isPlayer ? Math.min(this.combo, 5) : 1);
        snake.grow();
        snake.score += scoreBonus;
        
        this.emit('foodEaten', { snake, position, scoreBonus });
    }

    handlePowerUpCollected(snake, position, type) {
        const pIdx = this.powerUps.findIndex(p => p.x === position.x && p.y === position.y);
        if (pIdx >= 0) this.powerUps.splice(pIdx, 1);

        this.grid[position.y][position.x].isPowerUp = false;
        this.grid[position.y][position.x].powerUpType = null;

        if (window.soundEngine) window.soundEngine.playPowerUpSound();

        // Apply powerup effects
        switch (type) {
            case 'speed':
                snake.applySpeedBoost(5000);
                break;
            case 'shield':
                snake.shieldActive = true;
                break;
            case 'shrink':
                snake.shrink(3);
                break;
            case 'double':
                snake.applyDoubleScore(8000);
                break;
            case 'freeze':
                this.snakes.forEach(s => {
                    if (!s.isPlayer) s.applyFreeze(4000);
                });
                break;
        }

        this.emit('powerUpCollected', { snake, position, type });
    }
    
    handleSnakeDeath(snake, cause) {
        snake.isAlive = false;
        if (window.soundEngine && snake.isPlayer) window.soundEngine.playCrashSound();
        
        // Convert snake body into food or particles
        snake.body.forEach(seg => {
            if (this.isValidPosition(seg.x, seg.y)) {
                this.grid[seg.y][seg.x].occupied = false;
                this.grid[seg.y][seg.x].occupiedBy = null;
            }
        });
        
        this.emit('snakeDied', { snake, cause, position: snake.getHead() });
    }
    
    manageFoodSpawning() {
        const minFood = Math.max(2, this.snakes.filter(s => s.isAlive).length);
        while (this.food.length < minFood) {
            const pos = this.getRandomEmptyPosition();
            if (pos) {
                this.food.push(pos);
                this.grid[pos.y][pos.x].isFood = true;
            } else {
                break;
            }
        }
    }

    managePowerUpSpawning() {
        if (this.powerUps.length < 2 && Math.random() < 0.005) { // 0.5% chance per frame
            const pos = this.getRandomEmptyPosition();
            if (pos) {
                const types = ['speed', 'shield', 'shrink', 'double', 'freeze'];
                const type = types[Math.floor(Math.random() * types.length)];
                this.powerUps.push({ ...pos, type });
                this.grid[pos.y][pos.x].isPowerUp = true;
                this.grid[pos.y][pos.x].powerUpType = type;
            }
        }
    }
    
    getRandomEmptyPosition() {
        let attempts = 0;
        while (attempts < 50) {
            const x = Math.floor(Math.random() * this.worldWidth);
            const y = Math.floor(Math.random() * this.worldHeight);
            
            if (this.isValidPosition(x, y) && !this.grid[y][x].occupied && !this.grid[y][x].isFood && !this.grid[y][x].isPowerUp) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight;
    }
    
    checkGameOver() {
        const playerSnake = this.getPlayerSnake();
        const aliveSnakes = this.getAliveSnakes();
        
        if (playerSnake && !playerSnake.isAlive) {
            if (window.soundEngine) window.soundEngine.playGameOverSound();
            this.stop();
        } else if (aliveSnakes.length <= 1) {
            // Victory or solo state
            this.stop();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid lines (faint dark neon grid)
        this.drawGridLines();
        
        // Draw food
        this.drawFood();

        // Draw power-ups
        this.drawPowerUps();
        
        // Draw snakes
        this.snakes.forEach(snake => snake.render(this.ctx, this.cellSize));
        
        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));
    }

    drawGridLines() {
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawFood() {
        this.food.forEach(f => {
            const px = f.x * this.cellSize + this.cellSize / 2;
            const py = f.y * this.cellSize + this.cellSize / 2;
            
            this.ctx.save();
            this.ctx.shadowColor = '#ffe66d';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = '#ffe66d';
            this.ctx.beginPath();
            this.ctx.arc(px, py, this.cellSize / 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawPowerUps() {
        const icons = { speed: '⚡', shield: '🛡️', shrink: '🧪', double: '🌟', freeze: '❄️' };
        this.powerUps.forEach(p => {
            const px = p.x * this.cellSize + this.cellSize / 2;
            const py = p.y * this.cellSize + this.cellSize / 2;

            this.ctx.save();
            this.ctx.font = `${this.cellSize * 0.8}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icons[p.type] || '❓', px, py);
            this.ctx.restore();
        });
    }
    
    addSnake(snake) {
        this.snakes.push(snake);
    }
    
    getPlayerSnake() {
        return this.snakes.find(s => s.isPlayer);
    }
    
    getAliveSnakes() {
        return this.snakes.filter(s => s.isAlive);
    }
    
    getWorldBounds() {
        return { width: this.worldWidth, height: this.worldHeight };
    }
    
    getGrid() {
        return this.grid;
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
    
    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
    }
}

if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
}
