/**
 * Snake42 AI - AI Strategy Layer
 * Different AI behaviors and pathfinding algorithms
 */

// Base AI Strategy class
class AIStrategy {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.decisionCooldown = 0;
        this.lastDecisionTime = 0;
        
        // Difficulty settings
        this.difficultySettings = {
            easy: { reactionTime: 200, lookAhead: 3, errorRate: 0.2 },
            medium: { reactionTime: 100, lookAhead: 5, errorRate: 0.1 },
            hard: { reactionTime: 50, lookAhead: 8, errorRate: 0.05 },
            expert: { reactionTime: 25, lookAhead: 12, errorRate: 0.01 }
        };
        
        this.settings = this.difficultySettings[difficulty] || this.difficultySettings.medium;
    }
    
    // Abstract method - must be implemented by subclasses
    decide(snake, gameEngine) {
        throw new Error('decide() method must be implemented by subclass');
    }
    
    // Utility method for direction vectors
    getDirections() {
        return [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];
    }
    
    // Check if a position is safe to move to
    isSafePosition(x, y, gameEngine, snake) {
        // Check world bounds
        if (!gameEngine.isValidPosition(x, y)) {
            return false;
        }
        
        const grid = gameEngine.getGrid();
        const cell = grid[y][x];
        
        // Check for obstacles (other snakes or self)
        if (cell.occupied && cell.occupiedBy !== snake) {
            return false;
        }
        
        // Check for self-collision (except tail which will move)
        const tail = snake.getTail();
        for (let i = 0; i < snake.body.length - 1; i++) {
            const segment = snake.body[i];
            if (segment.x === x && segment.y === y) {
                return false;
            }
        }
        
        return true;
    }
    
    // Get distance between two points (Manhattan distance)
    getDistance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }
    
    // Add some randomness for difficulty
    shouldMakeError() {
        return Math.random() < this.settings.errorRate;
    }
    
    // Get all food positions
    getAllFood(gameEngine) {
        return gameEngine.food || [];
    }
    
    // Find nearest food
    findNearestFood(snake, gameEngine) {
        const head = snake.getHead();
        const food = this.getAllFood(gameEngine);
        
        if (food.length === 0) return null;
        
        let nearest = food[0];
        let nearestDistance = this.getDistance(head, nearest);
        
        for (let i = 1; i < food.length; i++) {
            const distance = this.getDistance(head, food[i]);
            if (distance < nearestDistance) {
                nearest = food[i];
                nearestDistance = distance;
            }
        }
        
        return nearest;
    }
    
    // Simple pathfinding using A*
    findPath(start, goal, gameEngine, snake) {
        const openSet = [{ pos: start, f: 0, g: 0, h: 0, parent: null }];
        const closedSet = new Set();
        const visited = new Map();
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const key = `${current.pos.x},${current.pos.y}`;
            
            if (closedSet.has(key)) continue;
            closedSet.add(key);
            
            // Check if we reached the goal
            if (current.pos.x === goal.x && current.pos.y === goal.y) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node.parent) {
                    path.unshift(node.pos);
                    node = node.parent;
                }
                return path;
            }
            
            // Explore neighbors
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
            
            // Limit search depth for performance
            if (current.g > this.settings.lookAhead) break;
        }
        
        return null; // No path found
    }
    
    // Get the next direction towards a target
    getDirectionTowards(snake, target) {
        if (!target) return null;
        
        const head = snake.getHead();
        const dx = target.x - head.x;
        const dy = target.y - head.y;
        
        // Prioritize the larger difference
        if (Math.abs(dx) > Math.abs(dy)) {
            return { x: Math.sign(dx), y: 0 };
        } else if (dy !== 0) {
            return { x: 0, y: Math.sign(dy) };
        } else if (dx !== 0) {
            return { x: Math.sign(dx), y: 0 };
        }
        
        return null;
    }
}

// Aggressive AI - Goes straight for food, takes risks
class AggressiveAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Aggressive';
        this.color = '#ff4757'; // Red
    }
    
    decide(snake, gameEngine) {
        // Add reaction time delay
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) {
            return null;
        }
        this.lastDecisionTime = currentTime;
        
        // Occasionally make errors for difficulty balancing
        if (this.shouldMakeError()) {
            const directions = this.getDirections();
            return directions[Math.floor(Math.random() * directions.length)];
        }
        
        // Find nearest food
        const nearestFood = this.findNearestFood(snake, gameEngine);
        if (!nearestFood) {
            // No food, move randomly but safely
            return this.findSafeDirection(snake, gameEngine);
        }
        
        // Use pathfinding for smarter movement
        const path = this.findPath(snake.getHead(), nearestFood, gameEngine, snake);
        if (path && path.length > 0) {
            const nextPos = path[0];
            const head = snake.getHead();
            return {
                x: nextPos.x - head.x,
                y: nextPos.y - head.y
            };
        }
        
        // Fallback to direct movement
        const direction = this.getDirectionTowards(snake, nearestFood);
        if (direction && this.isSafeDirection(snake, direction, gameEngine)) {
            return direction;
        }
        
        // Last resort: find any safe direction
        return this.findSafeDirection(snake, gameEngine);
    }
    
    isSafeDirection(snake, direction, gameEngine) {
        const head = snake.getHead();
        const newX = head.x + direction.x;
        const newY = head.y + direction.y;
        return this.isSafePosition(newX, newY, gameEngine, snake);
    }
    
    findSafeDirection(snake, gameEngine) {
        const head = snake.getHead();
        const directions = this.getDirections();
        
        for (const dir of directions) {
            const newX = head.x + dir.x;
            const newY = head.y + dir.y;
            if (this.isSafePosition(newX, newY, gameEngine, snake)) {
                return dir;
            }
        }
        
        return null; // No safe direction (death is imminent)
    }
}

// Defensive AI - Avoids danger, plays it safe
class DefensiveAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Defensive';
        this.color = '#2ed573'; // Green
        this.dangerRadius = 3; // How far to look for danger
    }
    
    decide(snake, gameEngine) {
        // Add reaction time delay
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) {
            return null;
        }
        this.lastDecisionTime = currentTime;
        
        // Occasionally make errors
        if (this.shouldMakeError()) {
            const directions = this.getDirections();
            return directions[Math.floor(Math.random() * directions.length)];
        }
        
        // Analyze all possible moves for safety
        const possibleMoves = this.analyzePossibleMoves(snake, gameEngine);
        
        if (possibleMoves.length === 0) {
            return null; // No safe moves
        }
        
        // Sort by safety score and food distance
        possibleMoves.sort((a, b) => {
            if (a.safetyScore !== b.safetyScore) {
                return b.safetyScore - a.safetyScore; // Higher safety first
            }
            return a.foodDistance - b.foodDistance; // Closer food second
        });
        
        return possibleMoves[0].direction;
    }
    
    analyzePossibleMoves(snake, gameEngine) {
        const head = snake.getHead();
        const directions = this.getDirections();
        const moves = [];
        
        for (const dir of directions) {
            const newX = head.x + dir.x;
            const newY = head.y + dir.y;
            
            if (!this.isSafePosition(newX, newY, gameEngine, snake)) {
                continue;
            }
            
            const safetyScore = this.calculateSafetyScore(newX, newY, gameEngine, snake);
            const foodDistance = this.getNearestFoodDistance(newX, newY, gameEngine);
            
            moves.push({
                direction: dir,
                position: { x: newX, y: newY },
                safetyScore,
                foodDistance
            });
        }
        
        return moves;
    }
    
    calculateSafetyScore(x, y, gameEngine, snake) {
        let score = 100; // Base safety score
        
        // Check for nearby dangers (other snakes)
        const aliveSnakes = gameEngine.getAliveSnakes();
        
        for (const otherSnake of aliveSnakes) {
            if (otherSnake === snake) continue;
            
            const otherHead = otherSnake.getHead();
            const distance = this.getDistance({ x, y }, otherHead);
            
            if (distance <= this.dangerRadius) {
                score -= (this.dangerRadius - distance) * 20;
            }
            
            // Extra penalty if other snake is longer (more dangerous)
            if (otherSnake.getLength() > snake.getLength()) {
                score -= 10;
            }
        }
        
        // Check for walls
        const bounds = gameEngine.getWorldBounds();
        const wallDistance = Math.min(x, y, bounds.width - 1 - x, bounds.height - 1 - y);
        if (wallDistance < 3) {
            score -= (3 - wallDistance) * 10;
        }
        
        // Check for dead ends
        const openSpaces = this.countOpenSpaces(x, y, gameEngine, snake, 3);
        if (openSpaces < 6) {
            score -= (6 - openSpaces) * 5;
        }
        
        return Math.max(0, score);
    }
    
    countOpenSpaces(x, y, gameEngine, snake, depth) {
        if (depth <= 0) return 0;
        
        let count = 1; // Current space
        const visited = new Set([`${x},${y}`]);
        const queue = [{ x, y, depth }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            for (const dir of this.getDirections()) {
                const newX = current.x + dir.x;
                const newY = current.y + dir.y;
                const key = `${newX},${newY}`;
                
                if (visited.has(key) || current.depth <= 0) continue;
                if (!this.isSafePosition(newX, newY, gameEngine, snake)) continue;
                
                visited.add(key);
                count++;
                
                if (current.depth > 1) {
                    queue.push({ x: newX, y: newY, depth: current.depth - 1 });
                }
            }
        }
        
        return count;
    }
    
    getNearestFoodDistance(x, y, gameEngine) {
        const food = this.getAllFood(gameEngine);
        if (food.length === 0) return Infinity;
        
        let minDistance = Infinity;
        for (const f of food) {
            const distance = this.getDistance({ x, y }, f);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
}

// Strategic AI - Plans ahead, tries to trap other snakes
class StrategicAI extends AIStrategy {
    constructor(difficulty = 'medium') {
        super(difficulty);
        this.name = 'Strategic';
        this.color = '#ffa502'; // Orange
        this.territoryMemory = new Map();
        this.planningHorizon = 5;
    }
    
    decide(snake, gameEngine) {
        // Add reaction time delay
        const currentTime = performance.now();
        if (currentTime - this.lastDecisionTime < this.settings.reactionTime) {
            return null;
        }
        this.lastDecisionTime = currentTime;
        
        // Occasionally make errors
        if (this.shouldMakeError()) {
            const directions = this.getDirections();
            return directions[Math.floor(Math.random() * directions.length)];
        }
        
        // Analyze game state
        const gameState = this.analyzeGameState(snake, gameEngine);
        
        // Choose strategy based on current situation
        if (gameState.isLeading && gameState.otherSnakesNearby.length > 0) {
            // Try to trap or block other snakes
            return this.planTrapMovement(snake, gameEngine, gameState);
        } else if (gameState.nearestFood && gameState.isHungry) {
            // Focus on food with strategic positioning
            return this.planFoodCollection(snake, gameEngine, gameState);
        } else {
            // Territory control and positioning
            return this.planTerritorialMovement(snake, gameEngine, gameState);
        }
    }
    
    analyzeGameState(snake, gameEngine) {
        const head = snake.getHead();
        const aliveSnakes = gameEngine.getAliveSnakes();
        const nearestFood = this.findNearestFood(snake, gameEngine);
        
        // Calculate if this snake is leading
        const maxLength = Math.max(...aliveSnakes.map(s => s.getLength()));
        const isLeading = snake.getLength() >= maxLength;
        
        // Find nearby other snakes
        const otherSnakesNearby = aliveSnakes
            .filter(s => s !== snake)
            .filter(s => this.getDistance(head, s.getHead()) <= 5);
        
        // Determine if snake needs food
        const averageLength = aliveSnakes.reduce((sum, s) => sum + s.getLength(), 0) / aliveSnakes.length;
        const isHungry = snake.getLength() < averageLength * 1.2;
        
        return {
            isLeading,
            isHungry,
            nearestFood,
            otherSnakesNearby,
            averageLength,
            dangerLevel: this.calculateDangerLevel(snake, gameEngine)
        };
    }
    
    calculateDangerLevel(snake, gameEngine) {
        const head = snake.getHead();
        let danger = 0;
        
        // Check for nearby walls
        const bounds = gameEngine.getWorldBounds();
        const wallDistance = Math.min(head.x, head.y, bounds.width - 1 - head.x, bounds.height - 1 - head.y);
        if (wallDistance < 2) danger += 30;
        
        // Check for nearby other snakes
        const aliveSnakes = gameEngine.getAliveSnakes();
        for (const otherSnake of aliveSnakes) {
            if (otherSnake === snake) continue;
            
            const distance = this.getDistance(head, otherSnake.getHead());
            if (distance <= 3) {
                danger += (4 - distance) * 15;
            }
        }
        
        return Math.min(100, danger);
    }
    
    planTrapMovement(snake, gameEngine, gameState) {
        // Try to position to cut off other snakes' paths to food
        const nearbySnakes = gameState.otherSnakesNearby;
        const nearestFood = gameState.nearestFood;
        
        if (!nearestFood || nearbySnakes.length === 0) {
            return this.findSafeDirection(snake, gameEngine);
        }
        
        // Find position that blocks path between enemy and food
        const enemy = nearbySnakes[0]; // Focus on closest enemy
        const enemyHead = enemy.getHead();
        
        // Calculate intercept position
        const interceptPoint = this.calculateInterceptPoint(snake.getHead(), enemyHead, nearestFood);
        
        if (interceptPoint) {
            const path = this.findPath(snake.getHead(), interceptPoint, gameEngine, snake);
            if (path && path.length > 0) {
                const nextPos = path[0];
                const head = snake.getHead();
                return {
                    x: nextPos.x - head.x,
                    y: nextPos.y - head.y
                };
            }
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
    
    calculateInterceptPoint(myPos, enemyPos, foodPos) {
        // Simple intercept calculation - position between enemy and food
        const midX = Math.floor((enemyPos.x + foodPos.x) / 2);
        const midY = Math.floor((enemyPos.y + foodPos.y) / 2);
        
        // Adjust to be closer to our position if possible
        const adjustedX = midX + Math.sign(myPos.x - midX);
        const adjustedY = midY + Math.sign(myPos.y - midY);
        
        return { x: adjustedX, y: adjustedY };
    }
    
    planFoodCollection(snake, gameEngine, gameState) {
        const nearestFood = gameState.nearestFood;
        if (!nearestFood) {
            return this.findSafeDirection(snake, gameEngine);
        }
        
        // Use advanced pathfinding that considers future positions
        const path = this.findStrategicPath(snake.getHead(), nearestFood, gameEngine, snake);
        
        if (path && path.length > 0) {
            const nextPos = path[0];
            const head = snake.getHead();
            return {
                x: nextPos.x - head.x,
                y: nextPos.y - head.y
            };
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
    
    planTerritorialMovement(snake, gameEngine, gameState) {
        // Move towards less occupied areas
        const head = snake.getHead();
        const bounds = gameEngine.getWorldBounds();
        
        // Find center of empty space
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        
        // Add some variation based on snake position
        const targetX = Math.floor(centerX + (Math.random() - 0.5) * bounds.width * 0.3);
        const targetY = Math.floor(centerY + (Math.random() - 0.5) * bounds.height * 0.3);
        
        const target = { 
            x: Math.max(1, Math.min(bounds.width - 2, targetX)),
            y: Math.max(1, Math.min(bounds.height - 2, targetY))
        };
        
        const direction = this.getDirectionTowards(snake, target);
        if (direction && this.isSafePosition(head.x + direction.x, head.y + direction.y, gameEngine, snake)) {
            return direction;
        }
        
        return this.findSafeDirection(snake, gameEngine);
    }
    
    findStrategicPath(start, goal, gameEngine, snake) {
        // Enhanced A* that considers snake movements
        const path = this.findPath(start, goal, gameEngine, snake);
        
        // TODO: Add prediction of other snake movements
        // For now, return basic pathfinding result
        
        return path;
    }
    
    findSafeDirection(snake, gameEngine) {
        const head = snake.getHead();
        const directions = this.getDirections();
        const safeDirections = [];
        
        for (const dir of directions) {
            const newX = head.x + dir.x;
            const newY = head.y + dir.y;
            if (this.isSafePosition(newX, newY, gameEngine, snake)) {
                const safetyScore = this.calculateSafetyScore(newX, newY, gameEngine, snake);
                safeDirections.push({ direction: dir, safety: safetyScore });
            }
        }
        
        if (safeDirections.length === 0) return null;
        
        // Sort by safety and return the safest
        safeDirections.sort((a, b) => b.safety - a.safety);
        return safeDirections[0].direction;
    }
    
    calculateSafetyScore(x, y, gameEngine, snake) {
        let score = 50;
        
        // Prefer center positions
        const bounds = gameEngine.getWorldBounds();
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const distanceFromCenter = this.getDistance({ x, y }, { x: centerX, y: centerY });
        score += Math.max(0, 20 - distanceFromCenter);
        
        // Avoid walls
        const wallDistance = Math.min(x, y, bounds.width - 1 - x, bounds.height - 1 - y);
        score += wallDistance * 2;
        
        // Avoid other snakes
        const aliveSnakes = gameEngine.getAliveSnakes();
        for (const otherSnake of aliveSnakes) {
            if (otherSnake === snake) continue;
            
            const distance = this.getDistance({ x, y }, otherSnake.getHead());
            if (distance < 4) {
                score -= (4 - distance) * 10;
            }
        }
        
        return score;
    }
}

// Export strategies
const AIStrategies = {
    AggressiveAI,
    DefensiveAI,
    StrategicAI
};

// Factory function to create AI strategies
function createAIStrategy(type, difficulty) {
    switch (type) {
        case 'aggressive':
            return new AggressiveAI(difficulty);
        case 'defensive':
            return new DefensiveAI(difficulty);
        case 'strategic':
            return new StrategicAI(difficulty);
        default:
            return new AggressiveAI(difficulty);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.AIStrategies = AIStrategies;
    window.createAIStrategy = createAIStrategy;
}
