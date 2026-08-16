/**
 * Snake42 AI - Web Audio API Sound Synthesizer
 * Zero-dependency retro arcade sound generator
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        
        // Lazy initialize AudioContext on user interaction
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
                console.log('Web Audio SoundEngine initialized');
            }
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }
    
    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    playEatSound(isSpecial = false) {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = isSpecial ? 'triangle' : 'sine';
        
        // Pitch rise
        const startFreq = isSpecial ? 523.25 : 300; // C5 or 300Hz
        const endFreq = isSpecial ? 1046.50 : 600;   // C6 or 600Hz
        
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);
        
        gain.gain.setValueAtTime(this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    playPowerUpSound() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteTime = now + idx * 0.06;
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            gain.gain.setValueAtTime(this.volume * 0.7, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.08);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteTime);
            osc.stop(noteTime + 0.08);
        });
    }
    
    playCrashSound() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3; // 300ms noise burst
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.3);
    }
    
    playClickSound() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.03);
    }
    
    playGameOverSound() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const notes = [400, 350, 300, 250]; // Descending tone
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteTime = now + idx * 0.12;
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            gain.gain.setValueAtTime(this.volume * 0.8, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(noteTime);
            osc.stop(noteTime + 0.15);
        });
    }
    
    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global instance
window.soundEngine = new SoundEngine();
