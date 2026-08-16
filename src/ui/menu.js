/**
 * Snake42 AI - Menu System & Navigation Manager
 */

class MenuManager {
    constructor() {
        this.currentScreen = 'main-menu';
        this.highScoresKey = 'snake42-high-scores';
    }

    init() {
        this.bindEvents();
        this.updateLeaderboardUI();
    }

    bindEvents() {
        // Play button click audio on menu buttons
        document.querySelectorAll('.menu-btn, .control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.soundEngine) {
                    window.soundEngine.playClickSound();
                }
            });
        });

        // High scores button
        const leaderboardBtn = document.getElementById('high-scores-btn');
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => this.showScreen('leaderboard-screen'));
        }

        // Save High Score on Game Over
        const saveScoreBtn = document.getElementById('save-score-btn');
        if (saveScoreBtn) {
            saveScoreBtn.addEventListener('click', () => this.handleSaveScore());
        }

        // Clear Leaderboard
        const clearScoresBtn = document.getElementById('clear-scores-btn');
        if (clearScoresBtn) {
            clearScoresBtn.addEventListener('click', () => this.clearHighScores());
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            this.currentScreen = screenId;
        }

        if (screenId === 'leaderboard-screen') {
            this.updateLeaderboardUI();
        }
    }

    getHighScores() {
        try {
            const raw = localStorage.getItem(this.highScoresKey);
            return raw ? JSON.parse(raw) : [
                { name: 'CyberSnake', score: 250, time: '02:15', date: '2026-08-16' },
                { name: 'ViperAI', score: 180, time: '01:45', date: '2026-08-16' },
                { name: 'NeonPython', score: 120, time: '01:20', date: '2026-08-16' }
            ];
        } catch (e) {
            return [];
        }
    }

    saveHighScore(name, score, time) {
        const scores = this.getHighScores();
        const newEntry = {
            name: name || 'Player',
            score: Number(score) || 0,
            time: time || '00:00',
            date: new Date().toISOString().split('T')[0]
        };

        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);
        const topScores = scores.slice(0, 10);

        try {
            localStorage.setItem(this.highScoresKey, JSON.stringify(topScores));
        } catch (e) {
            console.error('Failed to save high scores', e);
        }
        this.updateLeaderboardUI();
    }

    clearHighScores() {
        try {
            localStorage.removeItem(this.highScoresKey);
            this.updateLeaderboardUI();
        } catch (e) {
            console.error('Failed to clear high scores', e);
        }
    }

    handleSaveScore() {
        const nameInput = document.getElementById('player-name-input');
        const finalScoreEl = document.getElementById('final-score');
        const survivalTimeEl = document.getElementById('survival-time');

        const playerName = nameInput ? nameInput.value.trim() : 'Player';
        const score = finalScoreEl ? parseInt(finalScoreEl.textContent) : 0;
        const time = survivalTimeEl ? survivalTimeEl.textContent : '00:00';

        this.saveHighScore(playerName, score, time);
        
        if (saveScoreBtn) {
            saveScoreBtn.disabled = true;
            saveScoreBtn.textContent = 'Saved!';
        }
    }

    updateLeaderboardUI() {
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) return;

        const scores = this.getHighScores();
        if (scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No high scores yet!</td></tr>`;
            return;
        }

        tbody.innerHTML = scores.map((entry, index) => `
            <tr>
                <td>#${index + 1}</td>
                <td style="color: var(--primary-accent); font-weight: bold;">${this.escapeHTML(entry.name)}</td>
                <td style="color: var(--warning-color); font-weight: bold;">${entry.score}</td>
                <td>${entry.time}</td>
            </tr>
        `).join('');
    }

    escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
}

window.menuManager = new MenuManager();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.menuManager.init());
} else {
    window.menuManager.init();
}
