/**
 * Snake42 AI - Advanced AI Strategy Layer
 * Pathfinding (A*), Flood-Fill Trap Prevention, and Multi-Personality AI Behavior
 */

class AIStrategy {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.lastDecisionTime = 0;
        
        this.difficultySettings = {
            easy: { reactionTime: 220, lookAhead: 5, errorRate: 0.18, floodFillDepth: 12 },
            medium: { reactionTime: 120, lookAhead: 10, errorRate: 0.08, floodFillDepth: 25 },
            hard: { reactionTime: 60, lookAhead: 18, errorRate: 0.02, floodFillDepth: 40 },
            expert: { reactionTime: 20, lookAhead: 30, errorRate: 0.00, floodFillDepth: 60 }
        };
        
        this.settings = this.difficultySettings[difficulty] || this.difficultySettings.medium;
    }
    
    getDirections() {
        return [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
    }

    isSafePosition(x, y, gameEngine, snake) {
        if (!gameEngine.isValidPosition(x, y)) {
            return false;
        }
        
        const grid = gameEngine.getGrid();
        const cell = grid[y][x];
        
        if (cell.occupied && cell.occupiedBy !== snake) {
            return false;
        }
        
        // Self-collision check (excluding tail which moves unless growing)
        for (let i = 0; i < snake.body.length - (snake.growthPending > 0 ? 0 : 1); i++) {
            const segment = snake.body[i];
            if (segment.x === x && segment.y === y) {
                return false;
            }
        }
        
        return true;
    }
    
    getDistance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
    
    shouldMakeError() {
        return Math.random() < this.settings.errorRate;
    }
    
    getAllFoodAndPowerups(gameEngine) {
        const items = [...(gameEngine.food || [])];
        if (gameEngine.powerUps) {
            items.push(...gameEngine.powerUps);
        }
        return items;
    }

    // Flood fill algorithm to detect dead ends and self-traps
    calculateFloodFillSpace(x, y, gameEngine, snake, maxDepth = this.settings.floodFillDepth) {
        const visited = new Set([`${x},${y}`]);
        const queue = [{ x, y }];
        let count = 0;

        while (queue.length > 0 && count < maxDepth) {
            const current = queue.shift();
            count++;

            for (const dir of this.getDirections()) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const key = `${nx},${ny}`;

                if (visited.has(key)) continue;
                if (!this.isSafePosition(nx, ny, gameEngine, snake)) continue;

                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }

        return count;
    }
    
    // A* Pathfinding
    findPath(start, goal, gameEngine, snake) {
        const openSet = [{ pos: start, f: 0, g: 0, h: 0, parent: null }];
        const closedSet = new Set();
        const visited = new Map();
        
        let depth = 0;
        while (openSet.length > 0 && depth < 200) {
            depth++;
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const key = `${current.pos.x},${current.pos.y}`;
            
            if (closedSet.has(key)) continue;
            closedSet.add(key);
            
            if (current.pos.x === goal.x && current.pos.y === goal.y) {
                const path = [];
                let node = current;
                while (node.parent) {
                    path.unshift(node.pos);
                    node = node.parent;
                }
                return path;
            }
            
            for (const dir of this.getDirections()) {
                const newX = current.pos.x + dir.x;
                const newY = current.pos.y + dir.y;
                const neighborKey = `${newX},${newY}`;
                
                if (closedSet.has(neighborKey)) continue;
                if (!this.isSafePosition(newX, newY, gameEngine, snake)) continue;
                
                const g = current.g + 1;
                const h = this.getDistance({ x: newX, y: newY }, goal);
                const f = g + h;
                
                const existingNode = visited.get(neighborKey);
                if (!existingNode || f < existingNode.f) {
                    const neighbor = {
                        pos: { x: newX, y: newY },
                        f, g, h,
                        parent: current
                    };
                    visited.set(neighborKey, neighbor);
                    openSet.push(neighbor);
                }
            }
        }
        
        return null;
    }
    
    findSafeDirection(snake, gameEngine) {
        const head = snake.getHead();
        const directions = this.getDirections();
        let bestDir = null;
        let maxSpace = -1;
        
        for (const dir of directions) {
            const nx = head.x + dir.x;
            const ny = head.y + dir.y;
            
            if (this.isSafePosition(nx, ny, gameEngine, snake)) {
                const space = this.calculateFloodFillSpace(nx, ny, gameEngine, snake);
                if (space > maxSpace) {
                    maxSpace = space;
                    bestDir = dir;
                }
            }
        }
        
        return bestDir;
    }
}

// Aggressive AI - Hunts food & targets players
class AggressiveAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Aggressive';
        this.color = '#ff4757';
    }
    
    decide(snake, gameEngine) {
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) return null;
        this.lastDecisionTime = currentTime;
        
        if (this.shouldMakeError()) {
            return this.getDirections()[Math.floor(Math.random() * 4)];
        }
        
        const items = this.getAllFoodAndPowerups(gameEngine);
        const head = snake.getHead();
        
        if (items.length > 0) {
            // Find closest item
            let closest = items[0];
            let minDist = this.getDistance(head, closest);
            for (let i = 1; i < items.length; i++) {
                const dist = this.getDistance(head, items[i]);
                if (dist < minDist) {
                    minDist = dist;
                    closest = items[i];
                }
            }
            
            const path = this.findPath(head, closest, gameEngine, snake);
            if (path && path.length > 0) {
                const nextPos = path[0];
                const nx = nextPos.x;
                const ny = nextPos.y;
                const space = this.calculateFloodFillSpace(nx, ny, gameEngine, snake);
                if (space >= snake.body.length / 2) {
                    return { x: nx - head.x, y: ny - head.y };
                }
            }
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
}

// Defensive AI - Cautious survival specialist
class DefensiveAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Defensive';
        this.color = '#2ed573';
    }
    
    decide(snake, gameEngine) {
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) return null;
        this.lastDecisionTime = currentTime;
        
        const head = snake.getHead();
        const directions = this.getDirections();
        const moves = [];
        
        for (const dir of directions) {
            const nx = head.x + dir.x;
            const ny = head.y + dir.y;
            
            if (this.isSafePosition(nx, ny, gameEngine, snake)) {
                const space = this.calculateFloodFillSpace(nx, ny, gameEngine, snake);
                moves.push({ dir, space });
            }
        }
        
        if (moves.length === 0) return null;
        moves.sort((a, b) => b.space - a.space);
        
        return moves[0].dir;
    }
}

// Strategic AI - Strategic interceptor & power-up collector
class StrategicAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Strategic';
        this.color = '#ffa502';
    }
    
    decide(snake, gameEngine) {
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) return null;
        this.lastDecisionTime = currentTime;
        
        const head = snake.getHead();
        const items = this.getAllFoodAndPowerups(gameEngine);
        
        if (items.length > 0) {
            // Prioritize powerups over basic food
            items.sort((a, b) => (b.type ? 2 : 1) - (a.type ? 2 : 1) || this.getDistance(head, a) - this.getDistance(head, b));
            const target = items[0];
            
            const path = this.findPath(head, target, gameEngine, snake);
            if (path && path.length > 0) {
                const nextPos = path[0];
                return { x: nextPos.x - head.x, y: nextPos.y - head.y };
            }
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
}

// Greedy AI - Hyper-fixated on power-ups and rapid score growth
class GreedyAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Greedy';
        this.color = '#a55eea';
    }
    
    decide(snake, gameEngine) {
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) return null;
        this.lastDecisionTime = currentTime;
        
        const head = snake.getHead();
        const items = this.getAllFoodAndPowerups(gameEngine);
        
        if (items.length > 0) {
            let bestItem = items[0];
            let bestScore = -Infinity;
            
            for (const item of items) {
                const dist = this.getDistance(head, item);
                const value = item.type ? 50 : 10;
                const score = value / (dist + 1);
                if (score > bestScore) {
                    bestScore = score;
                    bestItem = item;
                }
            }
            
            const path = this.findPath(head, bestItem, gameEngine, snake);
            if (path && path.length > 0) {
                const nextPos = path[0];
                return { x: nextPos.x - head.x, y: nextPos.y - head.y };
            }
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
}

const AIStrategies = {
    AggressiveAI,
    DefensiveAI,
    StrategicAI,
    GreedyAI
};

function createAIStrategy(type, difficulty) {
    switch (type) {
        case 'aggressive': return new AggressiveAI(difficulty);
        case 'defensive': return new DefensiveAI(difficulty);
        case 'strategic': return new StrategicAI(difficulty);
        case 'greedy': return new GreedyAI(difficulty);
        default: return new AggressiveAI(difficulty);
    }
}

if (typeof window !== 'undefined') {
    window.AIStrategies = AIStrategies;
    window.createAIStrategy = createAIStrategy;
}
