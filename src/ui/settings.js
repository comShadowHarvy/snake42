/**
 * Snake42 AI - Settings UI Controller
 */

class SettingsController {
    constructor() {
        this.storageKey = 'snake42-settings';
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const resetBtn = document.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetDefaults());
        }
    }

    resetDefaults() {
        const defaults = {
            gameSpeed: 5,
            aiCount: 4,
            aiDifficulty: 'medium',
            gridSize: 25,
            soundEnabled: true,
            particlesEnabled: true
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(defaults));
            if (window.gameRenderer) {
                window.gameRenderer.populateSettingsForm();
            }
        } catch (e) {
            console.error('Failed to reset settings', e);
        }
    }
}

window.settingsController = new SettingsController();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.settingsController.init());
} else {
    window.settingsController.init();
}
