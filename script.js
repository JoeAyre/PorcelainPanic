// --- MARSHALL - what are you nosing around in here for? KRAPMAN's comin' to get ya! ---
// --- START OF FILE script.js ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startOnePlayerButton = document.getElementById('start-one-player');
    const startTwoPlayerButton = document.getElementById('start-two-player');
    const difficultySelect = document.getElementById('difficulty-select');
    const restartButton = document.getElementById('restart-button');
    const gameArea = document.getElementById('game-area');
    const poo = document.getElementById('poo');
    const toilet = document.getElementById('toilet');
    const toiletPaper = document.getElementById('toilet-paper');
    const food = document.getElementById('food');
    const flush = document.getElementById('flush');
    const effectOverlay = document.getElementById('effect-overlay');
    const winSound = document.getElementById('win-sound');
    const timerDisplay = document.getElementById('timer-display');
    const finalTimeDisplay = document.getElementById('final-time');
    const pooScoreDisplay = document.getElementById('poo-score-display');
    const toiletScoreDisplay = document.getElementById('toilet-score-display');
    const finalScoreDisplay = document.getElementById('final-score');
    const scoreDisplayContainer = document.getElementById('score-display-container');
    const levelDisplay = document.getElementById('level-display');

    // --- Game Configuration ---
    const WALL_SPEED = 1.5;
    const PLAYER_SIZE = 30;
    const ITEM_SIZE = 25;
    const POWERUP_DURATION = 3000;
    const DEBUFF_DURATION = 4000;
    const EFFECT_FLASH_DURATION = 500;
    const GAME_LOOP_INTERVAL_MS = 50; // Approx 20 FPS
    // --- AI Configuration ---
    const AI_MISTAKE_CHANCE = 0.15;
    const AI_RANDOM_MOVE_SCALE = 0.5;
    // --- Difficulty Speed Mapping (Higher value = Faster Toilet = Harder) ---
    // Note: Difficulty 1 is hardest, 7 is easiest. Speed mapping reflects this.
    const difficultySpeeds = {
        1: 5.0,  2: 4.8, 3: 4.6, 4: 4.3, 5: 4.0, 6: 3.7, 7: 3.4
    };
    const DEFAULT_TOILET_SPEED_2P = 4.0;

    // --- Game State Variables ---
    const initialPooPos = { x: 50, y: 50 };
    const initialToiletPos = { x: 500, y: 400 };
    let pooState = { x: initialPooPos.x, y: initialPooPos.y, speed: 5, baseSpeed: 5, element: poo, isSlowed: false, isPoweredUp: false };
    let toiletState = { x: initialToiletPos.x, y: initialToiletPos.y, speed: DEFAULT_TOILET_SPEED_2P, baseSpeed: DEFAULT_TOILET_SPEED_2P, element: toilet, isSlowed: false, isPoweredUp: false };
    let gameLoopInterval = null;
    let keysPressed = {};
    let GAME_WIDTH = 600;
    let GAME_HEIGHT = 500;
    let wallsState = [];
    let currentGameMode = null;
    let gameTimerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let selectedDifficulty = 4; // Default difficulty
    let pooScore = 0;
    let toiletScore = 0;
    let currentLevel = 0;

    // Wall definitions
    const initialWallConfigurations = [
        { x: 0, y: 100, width: 200, height: 20 }, { x: 300, y: 100, width: 300, height: 20 },
        { x: 100, y: 250, width: 400, height: 20 }, { x: 0, y: 400, width: 500, height: 20 },
        { x: 180, y: 120, width: 20, height: 150 }, { x: 480, y: 270, width: 20, height: 150 }
    ];

    // --- Helper Functions ---
    function positionElement(element, x, y) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    function getRelativeRect(element) {
        // Added safety check for element existence
        if (!element) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
         // Added safety check for gameArea existence
        if (!gameAreaRect) return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; // Fallback to viewport relative
        return {
            left: rect.left - gameAreaRect.left, top: rect.top - gameAreaRect.top,
            right: rect.right - gameAreaRect.left, bottom: rect.bottom - gameAreaRect.top,
            width: rect.width, height: rect.height
        };
    }

    function checkCollision(rect1, rect2) {
         // Added safety checks for valid rect objects
        if (!rect1 || !rect2 || typeof rect1.left === 'undefined' || typeof rect2.left === 'undefined') {
            // console.warn("Invalid rectangle passed to checkCollision");
            return false;
        }
        return (
            rect1.left < rect2.right && rect1.right > rect2.left &&
            rect1.top < rect2.bottom && rect1.bottom > rect2.top
        );
    }

    function getPlayerRect(playerState) {
        // Added safety check
        if (!playerState) return null;
        return {
            left: playerState.x, top: playerState.y,
            right: playerState.x + PLAYER_SIZE, bottom: playerState.y + PLAYER_SIZE,
            width: PLAYER_SIZE, height: PLAYER_SIZE
        };
    }

    function getItemRect(itemElement) {
        return getRelativeRect(itemElement);
    }

    function showBigPooEffect() {
        if (!effectOverlay) return;
        effectOverlay.innerHTML = '💩';
        effectOverlay.className = 'big-poo';
        effectOverlay.style.display = 'flex';
        setTimeout(() => {
            if (effectOverlay && effectOverlay.classList.contains('big-poo')) {
                effectOverlay.style.display = 'none';
                effectOverlay.innerHTML = '';
                effectOverlay.className = '';
            }
        }, EFFECT_FLASH_DURATION);
    }

    function showWaterfallEffect() {
        const numDrops = 20;
        const maxDelay = 350;
        const animationDuration = EFFECT_FLASH_DURATION;
        if (!gameArea) return; // Safety check
        for (let i = 0; i < numDrops; i++) {
            const dropElement = document.createElement('div');
            dropElement.classList.add('water-drop');
            dropElement.innerHTML = '💧';
            const randomLeft = Math.random() * 100;
            dropElement.style.left = `${randomLeft}%`;
            const randomDelay = Math.random() * maxDelay;
            dropElement.style.animationDelay = `${randomDelay}ms`;
            dropElement.style.animationDuration = `${animationDuration}ms`;
            gameArea.appendChild(dropElement);
            setTimeout(() => {
                // Check parentNode before removing
                if (dropElement.parentNode === gameArea) {
                    gameArea.removeChild(dropElement);
                }
            }, animationDuration + randomDelay + 50); // Small buffer
        }
    }

    function checkWinCondition() {
        // Added safety checks
        const pooRect = getPlayerRect(pooState);
        const toiletRect = getPlayerRect(toiletState);
        if (!pooRect || !toiletRect) return false;
        return checkCollision(pooRect, toiletRect);
    }

    function calculateCollisionAdjustedPosition(objectState, dx, dy) {
         // Added safety check
        if (!objectState) return { x: 0, y: 0};

        let nextX = objectState.x + dx;
        let nextY = objectState.y + dy;
        const objectSize = PLAYER_SIZE;

        // Ensure GAME_WIDTH/HEIGHT are valid numbers
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;


        // 1. Boundary checks
        nextX = Math.max(0, Math.min(validGameWidth - objectSize, nextX));
        nextY = Math.max(0, Math.min(validGameHeight - objectSize, nextY));

        // 2. Wall collision checks
        const potentialRect = { left: nextX, top: nextY, right: nextX + objectSize, bottom: nextY + objectSize };
        let collisionX = false;
        let collisionY = false;

        wallsState.forEach(wall => {
             // Added safety checks inside loop
            if (!wall || typeof wall.x === 'undefined') return;
            const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height };
            if (checkCollision(potentialRect, wallRect)) {
                const currentRect = getPlayerRect(objectState);
                if (!currentRect) return; // Need current pos for separation checks

                const potentialRectX = { ...currentRect, left: nextX, right: nextX + objectSize };
                if (dx !== 0 && checkCollision(potentialRectX, wallRect)) { collisionX = true; }

                const potentialRectY = { ...currentRect, top: nextY, bottom: nextY + objectSize };
                if (dy !== 0 && checkCollision(potentialRectY, wallRect)) { collisionY = true; }
            }
        });

        // Determine final position based on collisions
        let finalX = collisionX ? objectState.x : nextX;
        let finalY = collisionY ? objectState.y : nextY;

        // Final boundary clamp on the potentially adjusted position
        finalX = Math.max(0, Math.min(validGameWidth - objectSize, finalX));
        finalY = Math.max(0, Math.min(validGameHeight - objectSize, finalY));

        return { x: finalX, y: finalY };
    }

    function movePlayer(playerState, moveKeys) {
         // Added safety check
        if (!playerState || !playerState.element) return;

        let dx = 0; let dy = 0;
        if (moveKeys.up) dy -= playerState.speed;
        if (moveKeys.down) dy += playerState.speed;
        if (moveKeys.left) dx -= playerState.speed;
        if (moveKeys.right) dx += playerState.speed;

        // Normalize diagonal speed
        if (dx !== 0 && dy !== 0) {
            const factor = playerState.speed / Math.sqrt(dx * dx + dy * dy);
            dx *= factor; dy *= factor;
        }

        const finalPos = calculateCollisionAdjustedPosition(playerState, dx, dy);
        playerState.x = finalPos.x;
        playerState.y = finalPos.y;
        positionElement(playerState.element, playerState.x, playerState.y);
    }

    // --- Background/Level Functions ---
    const levelBackgrounds = [
        'linear-gradient(45deg, #2a2a4a, #4a2a4a)', 'linear-gradient(45deg, #4a2a2a, #4a4a2a)',
        'linear-gradient(45deg, #2a4a2a, #2a4a4a)', 'linear-gradient(45deg, #2a2a4a, #2a4a2a)',
        'linear-gradient(60deg, #5a3a5a, #3a3a5a)', 'linear-gradient(60deg, #634f34, #4a4a2a)',
        'linear-gradient(75deg, #223344, #443322)'
    ];

    function setBackgroundForLevel(level) {
        if (!gameArea) return; // Safety check
        // Ensure level is a non-negative integer
        const safeLevel = Math.max(0, Math.floor(level || 0));
        const backgroundIndex = safeLevel % levelBackgrounds.length;
        gameArea.style.background = levelBackgrounds[backgroundIndex];
    }

    // --- Update Display Function ---
    function updateGameStatusDisplay() {
        // Added safety checks for display elements
        if (pooScoreDisplay) pooScoreDisplay.textContent = `💩: ${pooScore}`;
        if (toiletScoreDisplay) toiletScoreDisplay.textContent = `🚽: ${toiletScore}`;
        if (levelDisplay) levelDisplay.textContent = `Lvl: ${currentLevel}`;
    }

    // --- Player State / Item Logic ---
    function resetPlayerState(playerState, startX, startY) {
        if (!playerState || !playerState.element) return; // Safety check
        playerState.x = startX;
        playerState.y = startY;
        // Speed is set in initGame based on mode/difficulty
        playerState.isSlowed = false;
        playerState.isPoweredUp = false;
        playerState.element.style.opacity = '1';
        playerState.element.style.filter = 'none';
        positionElement(playerState.element, playerState.x, playerState.y);
    }

    function applyDebuff(playerState, type) {
        if (!playerState || !playerState.element) return; // Safety check
        if (type === 'slow' && !playerState.isSlowed) {
            playerState.isSlowed = true;
            playerState.speed = playerState.baseSpeed * 0.5;
            playerState.element.style.opacity = '0.6';
            clearTimeout(playerState.debuffTimer); // Use unique timer property
            playerState.debuffTimer = setTimeout(() => {
                if (playerState && playerState.isSlowed) { // Check playerState still exists
                    playerState.speed = playerState.isPoweredUp ? playerState.baseSpeed * 1.5 : playerState.baseSpeed;
                    playerState.element.style.opacity = '1';
                    playerState.isSlowed = false;
                }
            }, DEBUFF_DURATION);
        }
    }

    function applyPowerup(playerState, type) {
        if (!playerState || !playerState.element) return; // Safety check
        playerState.isPoweredUp = true;
        playerState.speed = playerState.baseSpeed * 1.5;
        playerState.element.style.filter = 'brightness(1.5)';
        playerState.element.style.opacity = '1'; // Ensure not faded if slowed before
        if (type === 'food') { showBigPooEffect(); }
        else if (type === 'flush') { showWaterfallEffect(); }
        clearTimeout(playerState.powerupTimer); // Use unique timer property
        playerState.powerupTimer = setTimeout(() => {
            if (playerState && playerState.isPoweredUp) { // Check playerState still exists
                playerState.speed = playerState.isSlowed ? playerState.baseSpeed * 0.5 : playerState.baseSpeed; // Re-apply slow if needed
                playerState.element.style.filter = 'none';
                if (playerState.isSlowed) playerState.element.style.opacity = '0.6'; // Re-apply slow visual
                playerState.isPoweredUp = false;
            }
        }, POWERUP_DURATION);
    }

    // Respawn with random placement
    function respawnItem(itemElement, attempt = 1) {
        const maxAttempts = 10;
        if (attempt > maxAttempts) {
            console.warn(`Respawn ${itemElement?.id || 'item'} fail after ${maxAttempts} attempts.`);
            setTimeout(() => respawnItem(itemElement, 1), 5000 + Math.random() * 5000); // Try again much later
            return;
        }
        // Ensure game dimensions are valid numbers
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;

        const randomX = Math.random() * (validGameWidth - ITEM_SIZE);
        const randomY = Math.random() * (validGameHeight - ITEM_SIZE);
        const potentialItemRect = { left: randomX, top: randomY, right: randomX + ITEM_SIZE, bottom: randomY + ITEM_SIZE, width: ITEM_SIZE, height: ITEM_SIZE };
        let overlap = false;

        // Check Walls with buffer
        wallsState.forEach(wall => {
            if (!wall || typeof wall.x === 'undefined') return;
            const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height };
            const bufferedWallRect = { left: wallRect.left - (ITEM_SIZE / 2), top: wallRect.top - (ITEM_SIZE / 2), right: wallRect.right + (ITEM_SIZE / 2), bottom: wallRect.bottom + (ITEM_SIZE / 2) };
            if (checkCollision(potentialItemRect, bufferedWallRect)) { overlap = true; }
        });

        // Check Players if no overlap yet
        if (!overlap && (checkCollision(potentialItemRect, getPlayerRect(pooState)) || checkCollision(potentialItemRect, getPlayerRect(toiletState)))) {
             overlap = true;
        }

        // Check Other Items if no overlap yet
        if (!overlap) {
            [toiletPaper, food, flush].forEach(otherItem => {
                // Only check visible items, and don't check against self
                if (itemElement !== otherItem && otherItem && otherItem.style.display !== 'none') {
                     const otherItemRect = getItemRect(otherItem);
                     if (checkCollision(potentialItemRect, otherItemRect)) { overlap = true; }
                }
            });
        }

        // Place or Retry
        if (!overlap) {
            positionElement(itemElement, randomX, randomY);
            itemElement.style.display = 'block';
        } else {
            requestAnimationFrame(() => respawnItem(itemElement, attempt + 1)); // Try again next frame
        }
    }

    // --- Wall Initialization / Movement ---
    function initializeWalls() {
        if (!gameArea) return; // Safety check
        // Clear existing walls from DOM and state array
        wallsState.forEach(wall => {
            if (wall.element && wall.element.parentNode === gameArea) {
                gameArea.removeChild(wall.element);
            }
        });
        wallsState = [];

        // Create new walls
        initialWallConfigurations.forEach(config => {
             // Basic validation of config
            if (typeof config?.x !== 'number' || typeof config?.y !== 'number' || typeof config?.width !== 'number' || typeof config?.height !== 'number') {
                console.warn("Skipping invalid wall configuration:", config);
                return;
            }
            const wallElement = document.createElement('div');
            wallElement.classList.add('wall');
            wallElement.style.width = `${config.width}px`;
            wallElement.style.height = `${config.height}px`;
            gameArea.appendChild(wallElement);

            let dx = (Math.random() < 0.5 ? WALL_SPEED : -WALL_SPEED);
            let dy = (Math.random() < 0.5 ? WALL_SPEED : -WALL_SPEED);

            const wallState = {
                element: wallElement, x: config.x, y: config.y,
                width: config.width, height: config.height,
                dx: dx, dy: dy
            };
            wallsState.push(wallState);
            positionElement(wallElement, wallState.x, wallState.y);
        });
        // console.log(`Initialized ${wallsState.length} walls.`);
    }

    function moveWalls() {
        // Ensure game dimensions are valid
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;

        wallsState.forEach(wall => {
            if (!wall || !wall.element) return; // Safety check

            let nextX = wall.x + wall.dx;
            let nextY = wall.y + wall.dy;

            // Boundary checks
            if (nextX < 0 || nextX + wall.width > validGameWidth) {
                wall.dx *= -1;
                nextX = wall.x + wall.dx; // Recalculate potential position based on new direction
                nextX = Math.max(0, Math.min(validGameWidth - wall.width, nextX)); // Clamp
            }
            if (nextY < 0 || nextY + wall.height > validGameHeight) {
                wall.dy *= -1;
                nextY = wall.y + wall.dy; // Recalculate
                nextY = Math.max(0, Math.min(validGameHeight - wall.height, nextY)); // Clamp
            }

            wall.x = nextX;
            wall.y = nextY;
            positionElement(wall.element, wall.x, wall.y);
        });
    }

    // --- Level Up Logic ---
    function levelUp() {
        currentLevel++;
        // console.log(`Level Up! Reached Level ${currentLevel}`);
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);
        if (currentGameMode === 'onePlayer' && toiletState) { // Added toiletState check
            const speedIncrement = 0.18;
            toiletState.baseSpeed += speedIncrement;
            // Update current speed based on new base, respecting effects
            if (toiletState.isPoweredUp) { toiletState.speed = toiletState.baseSpeed * 1.5; }
            else if (toiletState.isSlowed) { toiletState.speed = toiletState.baseSpeed * 0.5; }
            else { toiletState.speed = toiletState.baseSpeed; }
            // console.log(`AI Toilet base speed increased to: ${toiletState.baseSpeed.toFixed(2)}`);
        }
        // Optional: Play a level-up sound effect here
    }

    // --- AI Movement Logic ---
    function moveAiToilet() {
        // Added safety checks for states
        if (!toiletState || !pooState || !flush) return;

        let dx = 0; let dy = 0;
        let targetX = pooState.x; let targetY = pooState.y;
        const currentX = toiletState.x; const currentY = toiletState.y;
        const isFlushVisible = flush.style.display !== 'none';
        const canUseFlush = isFlushVisible && !toiletState.isPoweredUp;

        if (canUseFlush) {
            const flushRect = getItemRect(flush);
            // Check if flushRect is valid before using its properties
            if (flushRect && typeof flushRect.left === 'number') {
                const flushTargetX = flushRect.left + ITEM_SIZE / 2;
                const flushTargetY = flushRect.top + ITEM_SIZE / 2;
                const distSqToPoo = (pooState.x - currentX) ** 2 + (pooState.y - currentY) ** 2;
                const distSqToFlush = (flushTargetX - currentX) ** 2 + (flushTargetY - currentY) ** 2;
                if (distSqToFlush < distSqToPoo) {
                    targetX = flushTargetX; targetY = flushTargetY;
                }
            }
        }

        const diffX = targetX - currentX; const diffY = targetY - currentY;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        let moveTowardsTarget = true;

        if (Math.random() < AI_MISTAKE_CHANCE) {
            if (Math.random() < 0.3) { // Hesitate
                moveTowardsTarget = false;
            } else { // Move somewhat randomly
                dx = (Math.random() - 0.5) * 2 * toiletState.speed * AI_RANDOM_MOVE_SCALE;
                dy = (Math.random() - 0.5) * 2 * toiletState.speed * AI_RANDOM_MOVE_SCALE;
                moveTowardsTarget = false;
            }
        }

        // Calculate final movement vector
        if (moveTowardsTarget && distance > PLAYER_SIZE / 4) { // Only move if target is sufficiently far
             // Avoid division by zero if distance is somehow 0
             if (distance > 0) {
                dx = (diffX / distance) * toiletState.speed;
                dy = (diffY / distance) * toiletState.speed;
             } else {
                 dx = 0; dy = 0;
             }
        } else if (!moveTowardsTarget && dx === 0 && dy === 0) {
            // Ensure hesitation results in no movement if random move wasn't chosen
             dx = 0; dy = 0;
        }
        // If distance is small, dx/dy naturally become close to 0

        const finalPos = calculateCollisionAdjustedPosition(toiletState, dx, dy);
        toiletState.x = finalPos.x;
        toiletState.y = finalPos.y;
        positionElement(toiletState.element, toiletState.x, toiletState.y);
    }

    // --- Item Collision & Initial Placement ---
    function checkItemCollisions(playerState) {
        if (!playerState) return; // Safety check
        const playerRect = getPlayerRect(playerState);
        if (!playerRect) return; // Safety check

        let scoreChanged = false;

        // Check Toilet Paper
        if (toiletPaper && toiletPaper.style.display !== 'none') {
            const itemRect = getItemRect(toiletPaper);
            if (checkCollision(playerRect, itemRect)) {
                applyDebuff(playerState, 'slow');
                toiletPaper.style.display = 'none';
                setTimeout(() => respawnItem(toiletPaper), 5000);
            }
        }

        // Check Food (Poo only)
        if (playerState.element.id === 'poo' && food && food.style.display !== 'none') {
            const itemRect = getItemRect(food);
            if (checkCollision(playerRect, itemRect)) {
                applyPowerup(playerState, 'food');
                pooScore++;
                scoreChanged = true;
                if (pooScore > 0 && pooScore % 5 === 0) {
                    levelUp();
                }
                food.style.display = 'none';
                setTimeout(() => respawnItem(food), 8000);
            }
        }

        // Check Flush (Toilet only)
        if (playerState.element.id === 'toilet' && flush && flush.style.display !== 'none') {
            const itemRect = getItemRect(flush);
            if (checkCollision(playerRect, itemRect)) {
                applyPowerup(playerState, 'flush');
                toiletScore++;
                scoreChanged = true;
                flush.style.display = 'none';
                setTimeout(() => respawnItem(flush), 8000);
            }
        }

        // Update display only if a score actually changed
        if (scoreChanged) {
            updateGameStatusDisplay();
        }
    }

    function placeItems() {
        // Safety check elements before trying to respawn
        if (toiletPaper) respawnItem(toiletPaper);
        if (food) respawnItem(food);
        if (flush) respawnItem(flush);
    }

    // --- Timer Update ---
    function updateTimerDisplay() {
        if (!gameLoopInterval || !timerDisplay) return; // Don't update if game isn't running or element missing
        const now = Date.now();
        // Ensure startTime is a valid number
        const validStartTime = typeof startTime === 'number' ? startTime : now;
        const currentElapsedTime = ((now - validStartTime) / 1000).toFixed(1);
        timerDisplay.textContent = `Time: ${currentElapsedTime}s`;
    }

    // --- Core Game Initialization and Loop ---
    function initGame() {
        // Safety check crucial elements needed for init
        if (!startScreen || !gameOverScreen || !gameArea || !pooState || !toiletState || !difficultySelect) {
            console.error("CRITICAL ERROR: Cannot initialize game, essential DOM element or state missing!");
            return;
        }

        // console.log(`Init Game Mode: ${currentGameMode}, Difficulty: ${selectedDifficulty}`);
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';

        // Show/hide displays based on mode
        if (timerDisplay) timerDisplay.style.display = (currentGameMode === 'onePlayer') ? 'block' : 'none';
        if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'block'; // Show always now

        // Get dimensions AFTER display: block
        GAME_WIDTH = gameArea.offsetWidth;
        GAME_HEIGHT = gameArea.offsetHeight;
        if (GAME_WIDTH === 0 || GAME_HEIGHT === 0) {
            console.warn("Game area dimensions zero! Falling back."); GAME_WIDTH = 600; GAME_HEIGHT = 500;
        }

        // Reset states
        keysPressed = {};
        pooScore = 0; toiletScore = 0; currentLevel = 0;

        // Set toilet speed based on mode/difficulty
        if (currentGameMode === 'onePlayer') {
            toiletState.baseSpeed = difficultySpeeds[selectedDifficulty] || 4.3; // Use mapping, fallback to normal
        } else { // Two player mode
            toiletState.baseSpeed = DEFAULT_TOILET_SPEED_2P; // Use fixed 2P speed
        }
        toiletState.speed = toiletState.baseSpeed; // Initialize current speed

        // Reset players (will use updated speed)
        resetPlayerState(pooState, initialPooPos.x, initialPooPos.y);
        resetPlayerState(toiletState, initialToiletPos.x, initialToiletPos.y);

        // Initialize dynamic elements
        initializeWalls();
        placeItems(); // Uses respawn logic

        // Update displays
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);

        // Clear any old intervals
        if (gameLoopInterval) { clearInterval(gameLoopInterval); gameLoopInterval = null; }
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }

        // Start timers
        startTime = Date.now();
        elapsedTime = 0;
        updateTimerDisplay(); // Initial display

        // Check for immediate win (unlikely but safe)
        if (checkWinCondition()) {
            console.error("Win condition met immediately after init!");
            // Optionally handle this more gracefully than just returning
            return;
        }

        // Start game loops
        gameLoopInterval = setInterval(gameLoop, GAME_LOOP_INTERVAL_MS);
        if (currentGameMode === 'onePlayer') {
            gameTimerInterval = setInterval(updateTimerDisplay, 100); // Update timer 10x per second
        }
    }

    function gameLoop() {
        // Core loop actions
        moveWalls();
        movePlayer(pooState, { up: keysPressed['w'], down: keysPressed['s'], left: keysPressed['a'], right: keysPressed['d'] });

        if (currentGameMode === 'twoPlayer') {
            movePlayer(toiletState, { up: keysPressed['arrowup'], down: keysPressed['arrowdown'], left: keysPressed['arrowleft'], right: keysPressed['arrowright'] });
        } else if (currentGameMode === 'onePlayer') {
            moveAiToilet();
        }

        checkItemCollisions(pooState);
        checkItemCollisions(toiletState);

        if (checkWinCondition()) {
            endGame();
        }
    }

    function endGame() {
        // Prevent double execution
        if (!gameLoopInterval) return;
        const finalElapsedTime = ((Date.now() - startTime) / 1000); // Use a local var

        // Stop game loops
        clearInterval(gameLoopInterval); gameLoopInterval = null;
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }

        // Play sound
        if (winSound) {
             winSound.currentTime = 0;
             winSound.play().catch(e => console.warn("Sound play failed:", e)); // Use warn for non-critical errors
        }

        // Prepare messages
        let timeText = '';
        let scoreText = '';
        if (currentGameMode === 'onePlayer') {
            timeText = `Survived for ${finalElapsedTime.toFixed(1)} seconds!`;
            scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`;
        } else { // Two Player
            timeText = ''; // No survival time
            scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`;
        }

        // Update display elements safely
        if (finalTimeDisplay) { finalTimeDisplay.textContent = timeText; }
        else { console.error("Cannot display final time - element not found."); }

        if (finalScoreDisplay) { finalScoreDisplay.textContent = scoreText; }
        else { console.error("Cannot display final score - element not found."); }

        // Show Game Over Screen safely
        if (gameOverScreen) { gameOverScreen.style.display = 'flex'; }
        else { console.error("Cannot show game over screen - element not found."); }

        // Hide Game Area safely
        if (gameArea) { gameArea.style.display = 'none'; }

        // console.log("endGame function finished");
    }

    // --- Event Listeners ---
    if (startOnePlayerButton) {
        startOnePlayerButton.addEventListener('click', () => {
             // Ensure difficultySelect exists before reading value
             selectedDifficulty = difficultySelect ? (parseInt(difficultySelect.value) || 4) : 4;
             currentGameMode = 'onePlayer';
             initGame();
        });
    } else { console.error("Start 1 Player button not found!"); }

    if (startTwoPlayerButton) {
        startTwoPlayerButton.addEventListener('click', () => {
             currentGameMode = 'twoPlayer';
             initGame();
        });
     } else { console.error("Start 2 Player button not found!"); }

    if (restartButton) {
        restartButton.addEventListener('click', () => {
             // Ensure screens exist before manipulating style
             if (gameOverScreen) gameOverScreen.style.display = 'none';
             if (startScreen) startScreen.style.display = 'flex';
             // Clear intervals defensively
             if (gameLoopInterval) clearInterval(gameLoopInterval); gameLoopInterval = null;
             if (gameTimerInterval) clearInterval(gameTimerInterval); gameTimerInterval = null;
        });
    } else { console.error("Restart button not found!"); }

    document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

    // --- Initial Setup ---
    // Ensure elements exist before setting initial style
    if (startScreen) startScreen.style.display = 'flex';
    if (gameArea) gameArea.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (timerDisplay) timerDisplay.style.display = 'none';
    if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'none';

}); // End DOMContentLoaded
// --- END OF FILE script.js ---
