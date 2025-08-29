/**
 * Snake42 AI - Main Renderer
 * Connects game engine, menu system, and handles application lifecycle
 */

class GameRenderer {
    constructor() {
        this.gameEngine = null;
        this.menuSystem = null;
        this.isInitialized = false;
        this.gameLoopId = null;
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.fpsCounter = 0;
        this.fpsUpdateInterval = 1000;
        this.lastFpsUpdate = 0;
        
        // Game state
        this.gameStartTime = 0;
        this.isGameRunning = false;
        
        console.log('Game renderer created');
    }
    
    async initialize() {
        try {
            // Initialize canvas and game engine
            await this.initializeGameEngine();
            
            // Initialize menu system
            await this.initializeMenuSystem();
            
            // Bind global events
            this.bindGlobalEvents();
            
            // Start the application
            this.startApplication();
            
            this.isInitialized = true;
            console.log('Game renderer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize game renderer:', error);
        }
    }
    
    async initializeGameEngine() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }
        
        // Load default settings
        const defaultSettings = {
            gridSize: 25,
            gameSpeed: 5,
            aiCount: 4,
            aiDifficulty: 'medium',
            soundEnabled: true,
            particlesEnabled: true
        };
        
        // Create game engine
        this.gameEngine = new GameEngine(canvas, defaultSettings);
        
        // Bind game engine events
        this.gameEngine.on('gameStarted', () => this.onGameStarted());
        this.gameEngine.on('gameStopped', () => this.onGameStopped());
        this.gameEngine.on('gameReset', () => this.onGameReset());
        this.gameEngine.on('foodEaten', (data) => this.onFoodEaten(data));
        this.gameEngine.on('snakeDied', (data) => this.onSnakeDied(data));
        this.gameEngine.on('fpsUpdated', (data) => this.onFpsUpdated(data));
        
        // Make globally available
        window.gameEngine = this.gameEngine;
        
        console.log('Game engine initialized');
    }
    
    async initializeMenuSystem() {
        // Simple menu system for now
        this.menuSystem = {
            currentScreen: 'main-menu',
            gameState: 'MENU',
            
            showScreen: (screenId) => {
                // Hide all screens
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                
                // Show target screen
                const targetScreen = document.getElementById(screenId);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                    this.menuSystem.currentScreen = screenId;
                }
            },
            
            getCurrentSettings: () => {
                return this.loadSettings();
            }
        };
        
        // Bind menu events
        this.bindMenuEvents();
        
        // Make globally available
        window.MenuSystem = this.menuSystem;
        
        console.log('Menu system initialized');
    }
    
    bindMenuEvents() {
        // Start game button
        const startBtn = document.getElementById('start-game');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        // Help button
        const helpBtn = document.getElementById('help');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelp());
        }
        
        // Quit button
        const quitBtn = document.getElementById('quit-game');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }
        
        // Back buttons
        document.querySelectorAll('[id^="back-to-menu"]').forEach(btn => {
            btn.addEventListener('click', () => this.showMainMenu());
        });
        
        // Pause button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        // Play again button
        const playAgainBtn = document.getElementById('play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.startGame());
        }
    }
    
    bindGlobalEvents() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Electron menu integration
        if (window.electronAPI) {
            window.electronAPI.onMenuNewGame(() => this.startGame());
            window.electronAPI.onMenuPauseToggle(() => this.togglePause());
            window.electronAPI.onMenuSettings(() => this.showSettings());
        }
        
        console.log('Global events bound');
    }
    
    startApplication() {
        // Show main menu
        this.showMainMenu();
        
        // Set app version
        if (window.electronAPI) {
            window.electronAPI.getVersion().then(version => {
                const versionEl = document.getElementById('app-version');
                if (versionEl) {
                    versionEl.textContent = `v${version}`;
                }
            });
        }
        
        console.log('Application started');
    }
    
    // Game lifecycle methods
    startGame() {
        console.log('Starting game...');
        
        // Reset game engine
        if (this.gameEngine) {
            this.gameEngine.reset();
        }
        
        // Load current settings
        const settings = this.loadSettings();
        if (this.gameEngine) {
            this.gameEngine.updateSettings(settings);
        }
        
        // Create snakes
        this.createGameSnakes(settings);
        
        // Show loading screen briefly
        this.menuSystem.showScreen('loading-screen');
        
        setTimeout(() => {
            // Show game screen
            this.menuSystem.showScreen('game-screen');
            this.menuSystem.gameState = 'PLAYING';
            
            // Start game engine
            if (this.gameEngine) {
                this.gameEngine.start();
                this.isGameRunning = true;
                this.gameStartTime = Date.now();
            }
            
            // Start game loop
            this.startGameLoop();
            
        }, 1000);
    }
    
    createGameSnakes(settings) {
        if (!this.gameEngine || !window.Snake || !window.createAIStrategy) {
            console.error('Missing dependencies for creating snakes');
            return;
        }
        
        const bounds = this.gameEngine.getWorldBounds();
        
        // Create human player snake
        const playerSnake = new window.Snake({
            x: Math.floor(bounds.width / 4),
            y: Math.floor(bounds.height / 2),
            isPlayer: true,
            color: '#00d4ff',
            headColor: '#00d4ff'
        });
        
        this.gameEngine.addSnake(playerSnake);
        
        // Create AI snakes
        const aiTypes = ['aggressive', 'defensive', 'strategic'];
        const aiColors = ['#ff4757', '#2ed573', '#ffa502', '#ff6b6b', '#5f27cd', '#00d2d3'];
        
        for (let i = 0; i < settings.aiCount; i++) {
            const aiType = aiTypes[i % aiTypes.length];
            const color = aiColors[i % aiColors.length];
            
            // Find spawn position
            let spawnX, spawnY;
            let attempts = 0;
            do {
                spawnX = Math.floor(Math.random() * (bounds.width - 10)) + 5;
                spawnY = Math.floor(Math.random() * (bounds.height - 10)) + 5;
                attempts++;
            } while (attempts < 20 && this.isPositionOccupied(spawnX, spawnY));
            
            const aiSnake = new window.Snake({
                x: spawnX,
                y: spawnY,
                isPlayer: false,
                color: color,
                headColor: color,
                aiStrategy: window.createAIStrategy(aiType, settings.aiDifficulty)
            });
            
            this.gameEngine.addSnake(aiSnake);
        }
        
        console.log(`Created ${settings.aiCount + 1} snakes (1 player, ${settings.aiCount} AI)`);
    }
    
    isPositionOccupied(x, y) {
        if (!this.gameEngine) return false;
        
        return this.gameEngine.snakes.some(snake => {
            return snake.body.some(segment => 
                segment.x === x && segment.y === y
            );
        });
    }
    
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.isGameRunning || !this.gameEngine || this.gameEngine.state !== 'PLAYING') {
                return;
            }
            
            // Update game HUD
            this.updateGameHUD();
            
            // Continue game loop
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };
        
        this.gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        this.isGameRunning = false;
    }
    
    togglePause() {
        if (this.gameEngine && this.menuSystem.gameState === 'PLAYING') {
            this.gameEngine.pause();
            this.menuSystem.gameState = this.gameEngine.isPaused ? 'PAUSED' : 'PLAYING';
            
            // Update pause button
            const pauseBtn = document.getElementById('pause-btn');
            if (pauseBtn) {
                const icon = pauseBtn.querySelector('.pause-icon');
                const text = pauseBtn.querySelector('.pause-text');
                if (this.gameEngine.isPaused) {
                    if (icon) icon.textContent = '▶️';
                    if (text) text.textContent = 'Resume';
                } else {
                    if (icon) icon.textContent = '⏸️';
                    if (text) text.textContent = 'Pause';
                }
            }
        }
    }
    
    updateGameHUD() {
        if (!this.gameEngine || this.menuSystem.gameState !== 'PLAYING') return;
        
        // Update player score
        const playerSnake = this.gameEngine.getPlayerSnake();
        if (playerSnake) {
            const scoreEl = document.getElementById('player-score');
            if (scoreEl) {
                scoreEl.textContent = playerSnake.getScore();
            }
        }
        
        // Update AI count
        const aliveAI = this.gameEngine.getAliveSnakes().filter(s => !s.isPlayer).length;
        const aiCountEl = document.getElementById('ai-count');
        if (aiCountEl) {
            aiCountEl.textContent = aliveAI;
        }
        
        // Update timer
        if (this.gameStartTime) {
            const elapsed = Date.now() - this.gameStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timerEl = document.getElementById('game-timer');
            if (timerEl) {
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }
    
    // Event handlers
    onGameStarted() {
        console.log('Game started');
        this.isGameRunning = true;
    }
    
    onGameStopped() {
        console.log('Game stopped');
        this.stopGameLoop();
        
        // Show game over screen
        const playerSnake = this.gameEngine ? this.gameEngine.getPlayerSnake() : null;
        const gameTime = Date.now() - this.gameStartTime;
        const aliveAI = this.gameEngine ? this.gameEngine.getAliveSnakes().filter(s => !s.isPlayer).length : 0;
        
        this.showGameOver({
            playerScore: playerSnake ? playerSnake.getScore() : 0,
            gameTime: gameTime,
            aiSnakesAlive: aliveAI
        });
    }
    
    onGameReset() {
        console.log('Game reset');
        this.stopGameLoop();
        this.isGameRunning = false;
    }
    
    onFoodEaten(data) {
        console.log('Food eaten by', data.snake.id);
        
        // Create particle effects if enabled
        if (window.ParticleSystem && this.gameEngine.settings.particlesEnabled) {
            const worldPos = {
                x: data.position.x * this.gameEngine.cellSize + this.gameEngine.cellSize / 2,
                y: data.position.y * this.gameEngine.cellSize + this.gameEngine.cellSize / 2
            };
            window.ParticleSystem.onFoodEaten(worldPos, data.snake.headColor);
        }
    }
    
    onSnakeDied(data) {
        console.log('Snake died:', data.snake.id, 'cause:', data.cause);
        
        // Create particle effects if enabled
        if (window.ParticleSystem && this.gameEngine.settings.particlesEnabled) {
            const worldPos = {
                x: data.position.x * this.gameEngine.cellSize + this.gameEngine.cellSize / 2,
                y: data.position.y * this.gameEngine.cellSize + this.gameEngine.cellSize / 2
            };
            window.ParticleSystem.onSnakeDeath(worldPos, data.snake.headColor);
        }
    }
    
    onFpsUpdated(data) {
        const fpsEl = document.getElementById('fps-display');
        if (fpsEl) {
            fpsEl.textContent = data.fps;
        }
    }
    
    // Screen navigation
    showMainMenu() {
        this.menuSystem.showScreen('main-menu');
        this.menuSystem.gameState = 'MENU';
        
        if (this.gameEngine) {
            this.gameEngine.stop();
        }
        this.stopGameLoop();
    }
    
    showSettings() {
        this.menuSystem.showScreen('settings-screen');
        this.populateSettingsForm();
    }
    
    showHelp() {
        this.menuSystem.showScreen('help-screen');
    }
    
    showGameOver(stats) {
        // Update game over stats
        const finalScoreEl = document.getElementById('final-score');
        const survivalTimeEl = document.getElementById('survival-time');
        const aiRemainingEl = document.getElementById('ai-remaining');
        
        if (finalScoreEl) finalScoreEl.textContent = stats.playerScore;
        if (survivalTimeEl) {
            const minutes = Math.floor(stats.gameTime / 60000);
            const seconds = Math.floor((stats.gameTime % 60000) / 1000);
            survivalTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (aiRemainingEl) aiRemainingEl.textContent = stats.aiSnakesAlive;
        
        this.menuSystem.showScreen('game-over-screen');
        this.menuSystem.gameState = 'GAME_OVER';
    }
    
    // Settings management
    loadSettings() {
        const defaultSettings = {
            gameSpeed: 5,
            aiCount: 4,
            aiDifficulty: 'medium',
            gridSize: 25,
            soundEnabled: true,
            particlesEnabled: true
        };
        
        try {
            const saved = localStorage.getItem('snake42-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.warn('Failed to load settings:', error);
            return defaultSettings;
        }
    }
    
    saveSettings() {
        const settings = this.gatherSettingsFromForm();
        
        try {
            localStorage.setItem('snake42-settings', JSON.stringify(settings));
            console.log('Settings saved:', settings);
            
            // Apply to game engine
            if (this.gameEngine) {
                this.gameEngine.updateSettings(settings);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    populateSettingsForm() {
        const settings = this.loadSettings();
        
        // Update form controls
        const gameSpeedSlider = document.getElementById('game-speed');
        const speedValue = document.getElementById('speed-value');
        if (gameSpeedSlider && speedValue) {
            gameSpeedSlider.value = settings.gameSpeed;
            speedValue.textContent = settings.gameSpeed;
            gameSpeedSlider.oninput = () => speedValue.textContent = gameSpeedSlider.value;
        }
        
        const aiCountSlider = document.getElementById('ai-count-setting');
        const aiCountValue = document.getElementById('ai-count-value');
        if (aiCountSlider && aiCountValue) {
            aiCountSlider.value = settings.aiCount;
            aiCountValue.textContent = settings.aiCount;
            aiCountSlider.oninput = () => aiCountValue.textContent = aiCountSlider.value;
        }
        
        const aiDifficultySelect = document.getElementById('ai-difficulty');
        if (aiDifficultySelect) {
            aiDifficultySelect.value = settings.aiDifficulty;
        }
        
        const gridSizeSelect = document.getElementById('grid-size');
        if (gridSizeSelect) {
            gridSizeSelect.value = settings.gridSize;
        }
        
        const soundCheckbox = document.getElementById('sound-enabled');
        if (soundCheckbox) {
            soundCheckbox.checked = settings.soundEnabled;
        }
        
        const particlesCheckbox = document.getElementById('particles-enabled');
        if (particlesCheckbox) {
            particlesCheckbox.checked = settings.particlesEnabled;
        }
        
        // Bind save button
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.onclick = () => {
                if (this.saveSettings()) {
                    this.showMainMenu();
                }
            };
        }
    }
    
    gatherSettingsFromForm() {
        return {
            gameSpeed: parseInt(document.getElementById('game-speed')?.value || 5),
            aiCount: parseInt(document.getElementById('ai-count-setting')?.value || 4),
            aiDifficulty: document.getElementById('ai-difficulty')?.value || 'medium',
            gridSize: parseInt(document.getElementById('grid-size')?.value || 25),
            soundEnabled: document.getElementById('sound-enabled')?.checked || false,
            particlesEnabled: document.getElementById('particles-enabled')?.checked || false
        };
    }
    
    // Input handling
    handleKeyPress(e) {
        switch (e.code) {
            case 'Escape':
                if (this.menuSystem.gameState === 'PLAYING') {
                    this.togglePause();
                } else if (this.menuSystem.currentScreen !== 'main-menu') {
                    this.showMainMenu();
                }
                break;
                
            case 'Space':
                if (this.menuSystem.gameState === 'PLAYING' || this.menuSystem.gameState === 'PAUSED') {
                    e.preventDefault();
                    this.togglePause();
                }
                break;
        }
        
        // Game controls
        if (this.menuSystem.gameState === 'PLAYING' && this.gameEngine) {
            const playerSnake = this.gameEngine.getPlayerSnake();
            if (playerSnake) {
                let direction = null;
                
                switch (e.code) {
                    case 'KeyW':
                    case 'ArrowUp':
                        direction = { x: 0, y: -1 };
                        break;
                    case 'KeyS':
                    case 'ArrowDown':
                        direction = { x: 0, y: 1 };
                        break;
                    case 'KeyA':
                    case 'ArrowLeft':
                        direction = { x: -1, y: 0 };
                        break;
                    case 'KeyD':
                    case 'ArrowRight':
                        direction = { x: 1, y: 0 };
                        break;
                }
                
                if (direction) {
                    e.preventDefault();
                    playerSnake.setDirection(direction);
                }
            }
        }
    }
    
    handleResize() {
        if (this.gameEngine) {
            // Game engine handles its own resize
            console.log('Window resized');
        }
    }
    
    quitGame() {
        if (window.electronAPI) {
            window.close();
        } else if (confirm('Are you sure you want to quit?')) {
            window.close();
        }
    }
    
    // Cleanup
    destroy() {
        this.stopGameLoop();
        
        if (this.gameEngine) {
            this.gameEngine.destroy();
        }
        
        console.log('Game renderer destroyed');
    }
}

// Initialize when DOM is ready
let gameRenderer;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

function initializeGame() {
    gameRenderer = new GameRenderer();
    gameRenderer.initialize();
    
    // Make globally available
    window.gameRenderer = gameRenderer;
}

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
    if (gameRenderer) {
        gameRenderer.destroy();
    }
});
