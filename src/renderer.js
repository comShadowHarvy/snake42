/**
 * Snake42 AI - Main Renderer
 * Connects game engine, menu system, audio, HUD, and touch controls
 */

class GameRenderer {
    constructor() {
        this.gameEngine = null;
        this.menuSystem = null;
        this.isInitialized = false;
        this.gameLoopId = null;
        
        this.gameStartTime = 0;
        this.isGameRunning = false;
    }
    
    async initialize() {
        try {
            await this.initializeGameEngine();
            await this.initializeMenuSystem();
            this.bindGlobalEvents();
            this.bindTouchControls();
            this.startApplication();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize game renderer:', error);
        }
    }
    
    async initializeGameEngine() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) throw new Error('Game canvas not found');
        
        const defaultSettings = this.loadSettings();
        this.gameEngine = new GameEngine(canvas, defaultSettings);
        
        this.gameEngine.on('gameStarted', () => this.onGameStarted());
        this.gameEngine.on('gameStopped', () => this.onGameStopped());
        this.gameEngine.on('gameReset', () => this.onGameReset());
        this.gameEngine.on('foodEaten', (data) => this.onFoodEaten(data));
        this.gameEngine.on('powerUpCollected', (data) => this.onPowerUpCollected(data));
        this.gameEngine.on('snakeDied', (data) => this.onSnakeDied(data));
        this.gameEngine.on('fpsUpdated', (data) => this.onFpsUpdated(data));
        
        window.gameEngine = this.gameEngine;
    }
    
    async initializeMenuSystem() {
        this.menuSystem = {
            currentScreen: 'main-menu',
            gameState: 'MENU',
            showScreen: (screenId) => {
                if (window.menuManager) {
                    window.menuManager.showScreen(screenId);
                } else {
                    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                    const target = document.getElementById(screenId);
                    if (target) target.classList.add('active');
                }
            },
            getCurrentSettings: () => this.loadSettings()
        };
        
        this.bindMenuEvents();
        window.MenuSystem = this.menuSystem;
    }
    
    bindMenuEvents() {
        const startBtn = document.getElementById('start-game');
        if (startBtn) startBtn.addEventListener('click', () => this.startGame());
        
        const settingsBtn = document.getElementById('settings');
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());
        
        const helpBtn = document.getElementById('help');
        if (helpBtn) helpBtn.addEventListener('click', () => this.showHelp());

        const leaderboardBtn = document.getElementById('high-scores-btn');
        if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        
        const quitBtn = document.getElementById('quit-game');
        if (quitBtn) quitBtn.addEventListener('click', () => this.quitGame());
        
        document.querySelectorAll('[id^="back-to-menu"]').forEach(btn => {
            btn.addEventListener('click', () => this.showMainMenu());
        });
        
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

        const soundToggleHud = document.getElementById('sound-hud-btn');
        if (soundToggleHud) {
            soundToggleHud.addEventListener('click', () => {
                if (window.soundEngine) {
                    const enabled = window.soundEngine.toggleSound();
                    soundToggleHud.textContent = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
                }
            });
        }
        
        const playAgainBtn = document.getElementById('play-again');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.startGame());
    }
    
    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    bindTouchControls() {
        const dpadUp = document.getElementById('dpad-up');
        const dpadDown = document.getElementById('dpad-down');
        const dpadLeft = document.getElementById('dpad-left');
        const dpadRight = document.getElementById('dpad-right');

        const sendDir = (dir) => {
            if (this.gameEngine && this.menuSystem.gameState === 'PLAYING') {
                const player = this.gameEngine.getPlayerSnake();
                if (player) player.setDirection(dir);
            }
        };

        if (dpadUp) dpadUp.addEventListener('touchstart', (e) => { e.preventDefault(); sendDir({ x: 0, y: -1 }); });
        if (dpadDown) dpadDown.addEventListener('touchstart', (e) => { e.preventDefault(); sendDir({ x: 0, y: 1 }); });
        if (dpadLeft) dpadLeft.addEventListener('touchstart', (e) => { e.preventDefault(); sendDir({ x: -1, y: 0 }); });
        if (dpadRight) dpadRight.addEventListener('touchstart', (e) => { e.preventDefault(); sendDir({ x: 1, y: 0 }); });

        if (dpadUp) dpadUp.addEventListener('click', () => sendDir({ x: 0, y: -1 }));
        if (dpadDown) dpadDown.addEventListener('click', () => sendDir({ x: 0, y: 1 }));
        if (dpadLeft) dpadLeft.addEventListener('click', () => sendDir({ x: -1, y: 0 }));
        if (dpadRight) dpadRight.addEventListener('click', () => sendDir({ x: 1, y: 0 }));
    }
    
    startApplication() {
        this.showMainMenu();
    }
    
    startGame() {
        if (this.gameEngine) this.gameEngine.reset();
        
        const settings = this.loadSettings();
        if (this.gameEngine) this.gameEngine.updateSettings(settings);
        
        this.createGameSnakes(settings);
        
        this.menuSystem.showScreen('loading-screen');
        
        setTimeout(() => {
            this.menuSystem.showScreen('game-screen');
            this.menuSystem.gameState = 'PLAYING';
            
            if (this.gameEngine) {
                this.gameEngine.start();
                this.isGameRunning = true;
                this.gameStartTime = Date.now();
            }
            
            this.startGameLoop();
        }, 500);
    }
    
    createGameSnakes(settings) {
        if (!this.gameEngine || !window.Snake || !window.createAIStrategy) return;
        
        const bounds = this.gameEngine.getWorldBounds();
        
        const playerSnake = new window.Snake({
            x: Math.floor(bounds.width / 4),
            y: Math.floor(bounds.height / 2),
            isPlayer: true,
            color: '#00d4ff',
            headColor: '#00d4ff'
        });
        
        this.gameEngine.addSnake(playerSnake);
        
        const aiTypes = ['aggressive', 'defensive', 'strategic', 'greedy'];
        const aiColors = ['#ff4757', '#2ed573', '#ffa502', '#a55eea', '#ff6b6b', '#00d2d3'];
        
        for (let i = 0; i < settings.aiCount; i++) {
            const aiType = aiTypes[i % aiTypes.length];
            const color = aiColors[i % aiColors.length];
            
            let spawnX, spawnY, attempts = 0;
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
    }
    
    isPositionOccupied(x, y) {
        if (!this.gameEngine) return false;
        return this.gameEngine.snakes.some(s => s.body.some(b => b.x === x && b.y === y));
    }
    
    startGameLoop() {
        const gameLoop = () => {
            if (!this.isGameRunning || !this.gameEngine || this.gameEngine.state !== 'PLAYING') return;
            this.updateGameHUD();
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
        if (this.gameEngine && (this.menuSystem.gameState === 'PLAYING' || this.menuSystem.gameState === 'PAUSED')) {
            this.gameEngine.pause();
            this.menuSystem.gameState = this.gameEngine.isPaused ? 'PAUSED' : 'PLAYING';
            
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
        
        const playerSnake = this.gameEngine.getPlayerSnake();
        if (playerSnake) {
            const scoreEl = document.getElementById('player-score');
            if (scoreEl) scoreEl.textContent = playerSnake.getScore();
        }
        
        const aliveAI = this.gameEngine.getAliveSnakes().filter(s => !s.isPlayer).length;
        const aiCountEl = document.getElementById('ai-count');
        if (aiCountEl) aiCountEl.textContent = aliveAI;

        const comboEl = document.getElementById('combo-display');
        if (comboEl) {
            if (this.gameEngine.combo > 1) {
                comboEl.textContent = `${this.gameEngine.combo}x COMBO! 🔥`;
                comboEl.style.display = 'block';
            } else {
                comboEl.style.display = 'none';
            }
        }
        
        if (this.gameStartTime) {
            const elapsed = Date.now() - this.gameStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timerEl = document.getElementById('game-timer');
            if (timerEl) timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    onGameStarted() { this.isGameRunning = true; }
    
    onGameStopped() {
        this.stopGameLoop();
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
        this.stopGameLoop();
        this.isGameRunning = false;
    }
    
    onFoodEaten(data) {
        if (window.ParticleSystem && this.gameEngine.settings.particlesEnabled) {
            const worldPos = {
                x: data.position.x * this.gameEngine.cellSize + this.gameEngine.cellSize / 2,
                y: data.position.y * this.gameEngine.cellSize + this.gameEngine.cellSize / 2
            };
            window.ParticleSystem.onFoodEaten(worldPos, data.snake.headColor);
        }
    }

    onPowerUpCollected(data) {
        if (window.ParticleSystem && this.gameEngine.settings.particlesEnabled) {
            const worldPos = {
                x: data.position.x * this.gameEngine.cellSize + this.gameEngine.cellSize / 2,
                y: data.position.y * this.gameEngine.cellSize + this.gameEngine.cellSize / 2
            };
            window.ParticleSystem.onPowerUpCollected(worldPos, data.type);
        }
    }
    
    onSnakeDied(data) {
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
        if (fpsEl) fpsEl.textContent = data.fps;
    }
    
    showMainMenu() {
        this.menuSystem.showScreen('main-menu');
        this.menuSystem.gameState = 'MENU';
        if (this.gameEngine) this.gameEngine.stop();
        this.stopGameLoop();
    }
    
    showSettings() {
        this.menuSystem.showScreen('settings-screen');
        this.populateSettingsForm();
    }
    
    showHelp() { this.menuSystem.showScreen('help-screen'); }
    showLeaderboard() { this.menuSystem.showScreen('leaderboard-screen'); }
    
    showGameOver(stats) {
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

        // Reset Save Score button state
        const saveScoreBtn = document.getElementById('save-score-btn');
        if (saveScoreBtn) {
            saveScoreBtn.disabled = false;
            saveScoreBtn.textContent = 'Save High Score';
        }
        
        this.menuSystem.showScreen('game-over-screen');
        this.menuSystem.gameState = 'GAME_OVER';
    }
    
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
        } catch (e) { return defaultSettings; }
    }
    
    saveSettings() {
        const settings = this.gatherSettingsFromForm();
        try {
            localStorage.setItem('snake42-settings', JSON.stringify(settings));
            if (this.gameEngine) this.gameEngine.updateSettings(settings);
            return true;
        } catch (e) { return false; }
    }
    
    populateSettingsForm() {
        const settings = this.loadSettings();
        
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
        if (aiDifficultySelect) aiDifficultySelect.value = settings.aiDifficulty;
        
        const soundCheckbox = document.getElementById('sound-enabled');
        if (soundCheckbox) soundCheckbox.checked = settings.soundEnabled;
        
        const particlesCheckbox = document.getElementById('particles-enabled');
        if (particlesCheckbox) particlesCheckbox.checked = settings.particlesEnabled;
        
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.onclick = () => {
                if (this.saveSettings()) this.showMainMenu();
            };
        }
    }
    
    gatherSettingsFromForm() {
        return {
            gameSpeed: parseInt(document.getElementById('game-speed')?.value || 5),
            aiCount: parseInt(document.getElementById('ai-count-setting')?.value || 4),
            aiDifficulty: document.getElementById('ai-difficulty')?.value || 'medium',
            gridSize: 25,
            soundEnabled: document.getElementById('sound-enabled')?.checked || false,
            particlesEnabled: document.getElementById('particles-enabled')?.checked || false
        };
    }
    
    handleKeyPress(e) {
        switch (e.code) {
            case 'Escape':
                if (this.menuSystem.gameState === 'PLAYING') this.togglePause();
                else if (this.menuSystem.currentScreen !== 'main-menu') this.showMainMenu();
                break;
            case 'Space':
                if (this.menuSystem.gameState === 'PLAYING' || this.menuSystem.gameState === 'PAUSED') {
                    e.preventDefault();
                    this.togglePause();
                }
                break;
        }
        
        if (this.menuSystem.gameState === 'PLAYING' && this.gameEngine) {
            const playerSnake = this.gameEngine.getPlayerSnake();
            if (playerSnake) {
                let direction = null;
                switch (e.code) {
                    case 'KeyW': case 'ArrowUp': direction = { x: 0, y: -1 }; break;
                    case 'KeyS': case 'ArrowDown': direction = { x: 0, y: 1 }; break;
                    case 'KeyA': case 'ArrowLeft': direction = { x: -1, y: 0 }; break;
                    case 'KeyD': case 'ArrowRight': direction = { x: 1, y: 0 }; break;
                }
                if (direction) {
                    e.preventDefault();
                    playerSnake.setDirection(direction);
                }
            }
        }
    }
    
    handleResize() {
        if (this.gameEngine) this.gameEngine.setupCanvas();
    }
    
    quitGame() {
        if (window.electronAPI) window.close();
        else if (confirm('Are you sure you want to return to menu?')) this.showMainMenu();
    }
    
    destroy() {
        this.stopGameLoop();
        if (this.gameEngine) this.gameEngine.destroy();
    }
}

let gameRenderer;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

function initializeGame() {
    gameRenderer = new GameRenderer();
    gameRenderer.initialize();
    window.gameRenderer = gameRenderer;
}

window.addEventListener('beforeunload', () => {
    if (gameRenderer) gameRenderer.destroy();
});
