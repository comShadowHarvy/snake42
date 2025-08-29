/**
 * Snake42 AI - Game Engine
 * Core game loop, collision detection, and world management
 */

class GameEngine {
    constructor(canvas, settings = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Game settings with defaults
        this.settings = {
            gridSize: 25,
            gameSpeed: 5,
            aiCount: 4,
            aiDifficulty: 'medium',
            soundEnabled: true,
            particlesEnabled: true,
            ...settings
        };
        
        // Game state
        this.state = 'MENU'; // MENU, LOADING, PLAYING, PAUSED, GAME_OVER
        this.isRunning = false;
        this.isPaused = false;
        
        // World dimensions
        this.updateWorldDimensions();
        
        // Game objects
        this.snakes = [];
        this.food = [];
        this.particles = [];
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.gameSpeedMultiplier = 1;
        
        // Statistics
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Event system
        this.eventListeners = {};
        
        // Grid for collision detection
        this.grid = [];
        this.initializeGrid();
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup
        this.setupCanvas();
        this.bindEvents();
        
        console.log('GameEngine initialized with settings:', this.settings);
    }
    
    updateWorldDimensions() {
        const cellSize = 20; // Fixed cell size for consistent visuals
        this.cellSize = cellSize;
        
        // Calculate grid dimensions based on canvas size
        this.worldWidth = Math.floor(this.canvas.width / cellSize);
        this.worldHeight = Math.floor(this.canvas.height / cellSize);
        
        console.log(`World dimensions: ${this.worldWidth}x${this.worldHeight}`);
    }
    
    setupCanvas() {
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Smooth rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.updateWorldDimensions();
    }
    
    bindEvents() {
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize() {
        // Debounce resize events
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
                    isFood: false
                };
            }
        }
    }
    
    // Event system
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    emit(event, data = {}) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    // Game state management
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChanged', { oldState, newState });
        console.log(`Game state changed: ${oldState} -> ${newState}`);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.setState('PLAYING');
        this.lastTime = performance.now();
        this.gameLoop();
        
        this.emit('gameStarted');
        console.log('Game started');
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.setState('PAUSED');
        } else {
            this.setState('PLAYING');
            this.lastTime = performance.now(); // Reset timing
        }
        
        this.emit('gamePaused', { isPaused: this.isPaused });
        console.log(this.isPaused ? 'Game paused' : 'Game resumed');
    }
    
    stop() {
        this.isRunning = false;
        this.setState('GAME_OVER');
        this.emit('gameStopped');
        console.log('Game stopped');
    }
    
    reset() {
        // Clear game objects
        this.snakes = [];
        this.food = [];
        this.particles = [];
        
        // Reset timing
        this.gameTime = 0;
        this.lastTime = 0;
        
        // Reset grid
        this.initializeGrid();
        
        this.emit('gameReset');
        console.log('Game reset');
    }
    
    // Game loop
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        // Skip update if paused
        if (!this.isPaused) {
            this.gameTime += this.deltaTime;
            this.update(this.deltaTime);
        }
        
        // Always render (for pause screen, etc.)
        this.render();
        
        // Schedule next frame
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
        // Update game speed based on settings
        this.gameSpeedMultiplier = this.settings.gameSpeed / 5; // Normalize to base speed
        
        // Update snakes
        this.snakes.forEach((snake, index) => {
            if (snake.isAlive) {
                snake.update(deltaTime * this.gameSpeedMultiplier, this);
            }
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.isAlive;
        });
        
        // Check collisions
        this.checkCollisions();
        
        // Manage food spawning
        this.manageFoodSpawning();
        
        // Check game over conditions
        this.checkGameOver();
    }
    
    checkCollisions() {
        this.snakes.forEach(snake => {
            if (!snake.isAlive) return;
            
            const head = snake.getHead();
            if (!this.isValidPosition(head.x, head.y)) {
                // Wall collision
                this.handleSnakeDeath(snake, 'wall');
                return;
            }
            
            const cell = this.grid[head.y][head.x];
            
            // Food collision
            if (cell.isFood) {
                this.handleFoodEaten(snake, head);
            }
            
            // Snake collision (self or others)
            if (cell.occupied && cell.occupiedBy !== snake) {
                this.handleSnakeDeath(snake, 'snake');
            }
        });
    }
    
    handleFoodEaten(snake, position) {
        // Remove food from grid and array
        const foodIndex = this.food.findIndex(f => f.x === position.x && f.y === position.y);
        if (foodIndex >= 0) {
            this.food.splice(foodIndex, 1);
        }
        
        this.grid[position.y][position.x].isFood = false;
        
        // Grow snake
        snake.grow();
        
        // Create particle effect
        if (this.settings.particlesEnabled) {
            this.createParticleEffect('collect', position);
        }
        
        // Emit event
        this.emit('foodEaten', {
            snake: snake,
            position: position,
            score: snake.getScore()
        });
        
        console.log(`Snake ${snake.id} ate food at (${position.x}, ${position.y})`);
    }
    
    handleSnakeDeath(snake, cause) {
        snake.kill();
        
        // Create particle effect
        if (this.settings.particlesEnabled) {
            this.createParticleEffect('explosion', snake.getHead());
        }
        
        // Remove snake from grid
        snake.body.forEach(segment => {
            if (this.isValidPosition(segment.x, segment.y)) {
                this.grid[segment.y][segment.x].occupied = false;
                this.grid[segment.y][segment.x].occupiedBy = null;
            }
        });
        
        // Emit event
        this.emit('snakeDied', {
            snake: snake,
            cause: cause,
            position: snake.getHead()
        });
        
        console.log(`Snake ${snake.id} died from ${cause}`);
    }
    
    manageFoodSpawning() {
        const targetFoodCount = Math.max(2, Math.floor(this.snakes.filter(s => s.isAlive).length * 1.5));
        
        while (this.food.length < targetFoodCount) {
            const position = this.findEmptyPosition();
            if (position) {
                this.spawnFood(position.x, position.y);
            } else {
                break; // No empty positions available
            }
        }
    }
    
    spawnFood(x, y) {
        if (!this.isValidPosition(x, y) || this.grid[y][x].occupied || this.grid[y][x].isFood) {
            return false;
        }
        
        const food = { x, y, spawnTime: this.gameTime };
        this.food.push(food);
        this.grid[y][x].isFood = true;
        
        // Create spawn particle effect
        if (this.settings.particlesEnabled) {
            this.createParticleEffect('spawn', { x, y });
        }
        
        this.emit('foodSpawned', { position: { x, y } });
        return true;
    }
    
    findEmptyPosition() {
        const maxAttempts = 100;
        
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const x = Math.floor(Math.random() * this.worldWidth);
            const y = Math.floor(Math.random() * this.worldHeight);
            
            if (this.isValidPosition(x, y) && !this.grid[y][x].occupied && !this.grid[y][x].isFood) {
                return { x, y };
            }
        }
        
        return null; // No empty position found
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight;
    }
    
    checkGameOver() {
        const aliveSnakes = this.snakes.filter(snake => snake.isAlive);
        const humanPlayer = this.snakes.find(snake => snake.isPlayer);
        
        // Game over if human player is dead
        if (humanPlayer && !humanPlayer.isAlive) {
            this.stop();
        }
        
        // Alternative: Game over if all snakes are dead
        if (aliveSnakes.length === 0) {
            this.stop();
        }
    }
    
    // Rendering
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid (subtle)
        this.drawGrid();
        
        // Draw food
        this.drawFood();
        
        // Draw snakes
        this.snakes.forEach(snake => {
            snake.render(this.ctx, this.cellSize);
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            particle.render(this.ctx, this.cellSize);
        });
        
        // Draw pause overlay if paused
        if (this.isPaused) {
            this.drawPauseOverlay();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.worldWidth; x++) {
            const pixelX = x * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pixelX, 0);
            this.ctx.lineTo(pixelX, this.worldHeight * this.cellSize);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.worldHeight; y++) {
            const pixelY = y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, pixelY);
            this.ctx.lineTo(this.worldWidth * this.cellSize, pixelY);
            this.ctx.stroke();
        }
    }
    
    drawFood() {
        this.food.forEach(food => {
            const x = food.x * this.cellSize;
            const y = food.y * this.cellSize;
            
            // Animated glow effect
            const pulse = Math.sin(this.gameTime * 0.005) * 0.3 + 0.7;
            const glowSize = this.cellSize * 0.6 * pulse;
            
            // Outer glow
            const gradient = this.ctx.createRadialGradient(
                x + this.cellSize / 2, y + this.cellSize / 2, 0,
                x + this.cellSize / 2, y + this.cellSize / 2, glowSize
            );
            gradient.addColorStop(0, '#ffe66d');
            gradient.addColorStop(1, 'rgba(255, 230, 109, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - glowSize/2 + this.cellSize/2, y - glowSize/2 + this.cellSize/2, glowSize, glowSize);
            
            // Food center
            this.ctx.fillStyle = '#ffe66d';
            this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        });
    }
    
    drawPauseOverlay() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause text
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.font = '48px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const text = 'PAUSED';
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        
        // Text glow effect
        this.ctx.shadowColor = '#00d4ff';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText(text, x, y);
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }
    
    // Particle system integration
    createParticleEffect(type, position) {
        if (!this.settings.particlesEnabled || !window.ParticleSystem) return;
        
        const particleSystem = window.ParticleSystem;
        const worldPos = {
            x: position.x * this.cellSize + this.cellSize / 2,
            y: position.y * this.cellSize + this.cellSize / 2
        };
        
        switch (type) {
            case 'collect':
                particleSystem.createFoodCollectEffect(worldPos);
                break;
            case 'explosion':
                particleSystem.createExplosionEffect(worldPos);
                break;
            case 'spawn':
                particleSystem.createSpawnEffect(worldPos);
                break;
        }
    }
    
    // Public API
    addSnake(snake) {
        this.snakes.push(snake);
        snake.id = `snake_${this.snakes.length}`;
        console.log(`Added snake: ${snake.id}`);
    }
    
    getAliveSnakes() {
        return this.snakes.filter(snake => snake.isAlive);
    }
    
    getPlayerSnake() {
        return this.snakes.find(snake => snake.isPlayer);
    }
    
    getGrid() {
        return this.grid;
    }
    
    getWorldBounds() {
        return {
            width: this.worldWidth,
            height: this.worldHeight
        };
    }
    
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        console.log('Game settings updated:', this.settings);
        this.emit('settingsUpdated', { settings: this.settings });
    }
    
    // Cleanup
    destroy() {
        this.isRunning = false;
        window.removeEventListener('resize', this.handleResize);
        clearTimeout(this.resizeTimeout);
        
        // Clear all arrays
        this.snakes = [];
        this.food = [];
        this.particles = [];
        this.eventListeners = {};
        
        console.log('GameEngine destroyed');
    }
}
