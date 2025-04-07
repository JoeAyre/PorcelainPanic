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
    const GAME_LOOP_INTERVAL_MS = 50;
    // --- AI Configuration ---
    const AI_MISTAKE_CHANCE = 0.15;
    const AI_RANDOM_MOVE_SCALE = 0.5;
    // --- Difficulty Speed Mapping (Lower value = Faster Toilet = Harder) ---
    const difficultySpeeds = {
        1: 5.0, 2: 4.8, 3: 4.6, 4: 4.3, 5: 4.0, 6: 3.7, 7: 3.4
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
    let selectedDifficulty = 4;
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
        const rect = element.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        return {
            left: rect.left - gameAreaRect.left, top: rect.top - gameAreaRect.top,
            right: rect.right - gameAreaRect.left, bottom: rect.bottom - gameAreaRect.top,
            width: rect.width, height: rect.height
        };
    }

    function checkCollision(rect1, rect2) {
        return (
            rect1.left < rect2.right && rect1.right > rect2.left &&
            rect1.top < rect2.bottom && rect1.bottom > rect2.top
        );
    }

    function getPlayerRect(playerState) {
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
        effectOverlay.innerHTML = '💩';
        effectOverlay.className = 'big-poo';
        effectOverlay.style.display = 'flex';
        setTimeout(() => {
            if (effectOverlay.classList.contains('big-poo')) {
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
                if (dropElement.parentNode === gameArea) {
                    gameArea.removeChild(dropElement);
                }
            }, animationDuration + randomDelay + 50);
        }
    }

    function checkWinCondition() {
        return checkCollision(getPlayerRect(pooState), getPlayerRect(toiletState));
    }

    function calculateCollisionAdjustedPosition(objectState, dx, dy) {
        let nextX = objectState.x + dx;
        let nextY = objectState.y + dy;
        const objectSize = PLAYER_SIZE;

        // 1. Boundary checks
        nextX = Math.max(0, Math.min(GAME_WIDTH - objectSize, nextX));
        nextY = Math.max(0, Math.min(GAME_HEIGHT - objectSize, nextY));

        // 2. Wall collision checks
        const potentialRect = { left: nextX, top: nextY, right: nextX + objectSize, bottom: nextY + objectSize };
        let collisionX = false;
        let collisionY = false;

        wallsState.forEach(wall => {
            const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height };
            if (checkCollision(potentialRect, wallRect)) {
                const currentRect = { left: objectState.x, top: objectState.y, right: objectState.x + objectSize, bottom: objectState.y + objectSize };
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
        finalX = Math.max(0, Math.min(GAME_WIDTH - objectSize, finalX));
        finalY = Math.max(0, Math.min(GAME_HEIGHT - objectSize, finalY));

        return { x: finalX, y: finalY };
    }

    function movePlayer(playerState, moveKeys) {
        let dx = 0; let dy = 0;
        if (moveKeys.up) dy -= playerState.speed;
        if (moveKeys.down) dy += playerState.speed;
        if (moveKeys.left) dx -= playerState.speed;
        if (moveKeys.right) dx += playerState.speed;

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
        const backgroundIndex = level % levelBackgrounds.length;
        gameArea.style.background = levelBackgrounds[backgroundIndex];
    }

    // --- Update Display Function ---
    function updateGameStatusDisplay() {
        pooScoreDisplay.textContent = `💩: ${pooScore}`;
        toiletScoreDisplay.textContent = `🚽: ${toiletScore}`;
        levelDisplay.textContent = `Lvl: ${currentLevel}`;
    }

    // --- Player State / Item Logic ---
    function resetPlayerState(playerState, startX, startY) {
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
        if (type === 'slow' && !playerState.isSlowed) {
            playerState.isSlowed = true;
            playerState.speed = playerState.baseSpeed * 0.5;
            playerState.element.style.opacity = '0.6';
            clearTimeout(playerState.debuffTimer);
            playerState.debuffTimer = setTimeout(() => {
                if (playerState.isSlowed) {
                    playerState.speed = playerState.isPoweredUp ? playerState.baseSpeed * 1.5 : playerState.baseSpeed;
                    playerState.element.style.opacity = '1';
                    playerState.isSlowed = false;
                }
            }, DEBUFF_DURATION);
        }
    }

    function applyPowerup(playerState, type) {
        playerState.isPoweredUp = true;
        playerState.speed = playerState.baseSpeed * 1.5;
        playerState.element.style.filter = 'brightness(1.5)';
        playerState.element.style.opacity = '1';
        if (type === 'food') { showBigPooEffect(); }
        else if (type === 'flush') { showWaterfallEffect(); }
        clearTimeout(playerState.powerupTimer);
        playerState.powerupTimer = setTimeout(() => {
            if (playerState.isPoweredUp) {
                playerState.speed = playerState.isSlowed ? playerState.baseSpeed * 0.5 : playerState.baseSpeed;
                playerState.element.style.filter = 'none';
                if (playerState.isSlowed) playerState.element.style.opacity = '0.6';
                playerState.isPoweredUp = false;
            }
        }, POWERUP_DURATION);
    }

    // Respawn with random placement
    function respawnItem(itemElement, attempt = 1) {
        const maxAttempts = 10;
        if (attempt > maxAttempts) {
            console.warn(`Respawn ${itemElement.id} fail after ${maxAttempts} attempts.`);
            setTimeout(() => respawnItem(itemElement, 1), 5000 + Math.random() * 5000); // Try again much later
            return;
        }
        const randomX = Math.random() * (GAME_WIDTH - ITEM_SIZE);
        const randomY = Math.random() * (GAME_HEIGHT - ITEM_SIZE);
        const potentialItemRect = { left: randomX, top: randomY, right: randomX + ITEM_SIZE, bottom: randomY + ITEM_SIZE, width: ITEM_SIZE, height: ITEM_SIZE };
        let overlap = false;
        // Check Walls with buffer
        wallsState.forEach(wall => {
            const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height };
            const bufferedWallRect = { left: wallRect.left - (ITEM_SIZE / 2), top: wallRect.top - (ITEM_SIZE / 2), right: wallRect.right + (ITEM_SIZE / 2), bottom: wallRect.bottom + (ITEM_SIZE / 2) };
            if (checkCollision(potentialItemRect, bufferedWallRect)) { overlap = true; }
        });
        // Check Players
        if (!overlap && (checkCollision(potentialItemRect, getPlayerRect(pooState)) || checkCollision(potentialItemRect, getPlayerRect(toiletState)))) { overlap = true; }
        // Check Other Items
        if (!overlap) {
            [toiletPaper, food, flush].forEach(otherItem => {
                if (itemElement !== otherItem && otherItem.style.display !== 'none') {
                    if (checkCollision(potentialItemRect, getItemRect(otherItem))) { overlap = true; }
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
        wallsState.forEach(wall => wall.element.remove());
        wallsState = [];
        initialWallConfigurations.forEach(config => {
            const wallElement = document.createElement('div');
            wallElement.classList.add('wall');
            wallElement.style.width = `${config.width}px`;
            wallElement.style.height = `${config.height}px`;
            gameArea.appendChild(wallElement);
            let dx = (Math.random() < 0.5 ? WALL_SPEED : -WALL_SPEED);
            let dy = (Math.random() < 0.5 ? WALL_SPEED : -WALL_SPEED);
            const wallState = { element: wallElement, x: config.x, y: config.y, width: config.width, height: config.height, dx: dx, dy: dy };
            wallsState.push(wallState);
            positionElement(wallElement, wallState.x, wallState.y);
        });
        // console.log(`Initialized ${wallsState.length} walls.`);
    }

    function moveWalls() {
        wallsState.forEach(wall => {
            let nextX = wall.x + wall.dx;
            let nextY = wall.y + wall.dy;
            if (nextX < 0 || nextX + wall.width > GAME_WIDTH) {
                wall.dx *= -1; nextX = wall.x + wall.dx;
                nextX = Math.max(0, Math.min(GAME_WIDTH - wall.width, nextX));
            }
            if (nextY < 0 || nextY + wall.height > GAME_HEIGHT) {
                wall.dy *= -1; nextY = wall.y + wall.dy;
                nextY = Math.max(0, Math.min(GAME_HEIGHT - wall.height, nextY));
            }
            wall.x = nextX; wall.y = nextY;
            positionElement(wall.element, wall.x, wall.y);
        });
    }

    // --- Level Up Logic ---
    function levelUp() {
        currentLevel++;
        // console.log(`Level Up! Reached Level ${currentLevel}`);
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);
        if (currentGameMode === 'onePlayer') {
            const speedIncrement = 0.18;
            toiletState.baseSpeed += speedIncrement;
            if (toiletState.isPoweredUp) { toiletState.speed = toiletState.baseSpeed * 1.5; }
            else if (toiletState.isSlowed) { toiletState.speed = toiletState.baseSpeed * 0.5; }
            else { toiletState.speed = toiletState.baseSpeed; }
            // console.log(`AI Toilet base speed increased to: ${toiletState.baseSpeed.toFixed(2)}`);
        }
        // Optional: Play a level-up sound effect here
    }

    // --- AI Movement Logic ---
    function moveAiToilet() {
        let dx = 0; let dy = 0;
        let targetX = pooState.x; let targetY = pooState.y;
        const currentX = toiletState.x; const currentY = toiletState.y;
        const isFlushVisible = flush.style.display !== 'none';
        const canUseFlush = isFlushVisible && !toiletState.isPoweredUp;

        if (canUseFlush) {
            const flushRect = getItemRect(flush);
            const flushTargetX = flushRect.left + ITEM_SIZE / 2;
            const flushTargetY = flushRect.top + ITEM_SIZE / 2;
            const distSqToPoo = (pooState.x - currentX) ** 2 + (pooState.y - currentY) ** 2;
            const distSqToFlush = (flushTargetX - currentX) ** 2 + (flushTargetY - currentY) ** 2;
            if (distSqToFlush < distSqToPoo) {
                targetX = flushTargetX; targetY = flushTargetY;
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

        if (moveTowardsTarget && distance > PLAYER_SIZE / 4) {
            dx = (diffX / distance) * toiletState.speed;
            dy = (diffY / distance) * toiletState.speed;
        } else if (!moveTowardsTarget && dx === 0 && dy === 0) {
            dx = 0; dy = 0;
        }

        const finalPos = calculateCollisionAdjustedPosition(toiletState, dx, dy);
        toiletState.x = finalPos.x;
        toiletState.y = finalPos.y;
        positionElement(toiletState.element, toiletState.x, toiletState.y);
    }

    // --- Item Collision & Initial Placement ---
    function checkItemCollisions(playerState) {
        const playerRect = getPlayerRect(playerState);
        let scoreChanged = false;

        if (toiletPaper.style.display !== 'none' && checkCollision(playerRect, getItemRect(toiletPaper))) {
            applyDebuff(playerState, 'slow');
            toiletPaper.style.display = 'none';
            setTimeout(() => respawnItem(toiletPaper), 5000);
        }
        if (playerState.element.id === 'poo' && food.style.display !== 'none' && checkCollision(playerRect, getItemRect(food))) {
            applyPowerup(playerState, 'food');
            pooScore++;
            scoreChanged = true;
            if (pooScore > 0 && pooScore % 5 === 0) {
                levelUp();
            }
            food.style.display = 'none';
            setTimeout(() => respawnItem(food), 8000);
        }
        if (playerState.element.id === 'toilet' && flush.style.display !== 'none' && checkCollision(playerRect, getItemRect(flush))) {
            applyPowerup(playerState, 'flush');
            toiletScore++;
            scoreChanged = true;
            flush.style.display = 'none';
            setTimeout(() => respawnItem(flush), 8000);
        }
        if (scoreChanged) {
            updateGameStatusDisplay();
        }
    }

    function placeItems() {
        respawnItem(toiletPaper);
        respawnItem(food);
        respawnItem(flush);
    }

    // --- Timer Update ---
    function updateTimerDisplay() {
        if (!gameLoopInterval) return;
        const now = Date.now();
        const currentElapsedTime = ((now - startTime) / 1000).toFixed(1);
        timerDisplay.textContent = `Time: ${currentElapsedTime}s`;
    }

    // --- Core Game Initialization and Loop ---
    function initGame() {
        // console.log(`Init Game Mode: ${currentGameMode}, Difficulty: ${selectedDifficulty}`);
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        timerDisplay.style.display = (currentGameMode === 'onePlayer') ? 'block' : 'none';
        scoreDisplayContainer.style.display = 'block';

        GAME_WIDTH = gameArea.offsetWidth;
        GAME_HEIGHT = gameArea.offsetHeight;
        if (GAME_WIDTH === 0 || GAME_HEIGHT === 0) {
            console.error("Game area dimensions zero!"); GAME_WIDTH = 600; GAME_HEIGHT = 500;
        }

        keysPressed = {};
        pooScore = 0; toiletScore = 0; currentLevel = 0;

        if (currentGameMode === 'onePlayer') {
            toiletState.baseSpeed = difficultySpeeds[selectedDifficulty] || 4.3;
        } else {
            toiletState.baseSpeed = DEFAULT_TOILET_SPEED_2P;
        }
        toiletState.speed = toiletState.baseSpeed;

        resetPlayerState(pooState, initialPooPos.x, initialPooPos.y);
        resetPlayerState(toiletState, initialToiletPos.x, initialToiletPos.y);
        initializeWalls();
        placeItems();
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);

        if (gameLoopInterval) { clearInterval(gameLoopInterval); gameLoopInterval = null; }
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }

        startTime = Date.now();
        elapsedTime = 0;
        updateTimerDisplay(); // Initial display

        if (checkWinCondition()) { console.error("Win condition met immediately!"); return; }

        gameLoopInterval = setInterval(gameLoop, GAME_LOOP_INTERVAL_MS);
        if (currentGameMode === 'onePlayer') {
            gameTimerInterval = setInterval(updateTimerDisplay, 100);
        }
    }

    function gameLoop() {
        moveWalls();
        movePlayer(pooState, { up: keysPressed['w'], down: keysPressed['s'], left: keysPressed['a'], right: keysPressed['d'] });
        if (currentGameMode === 'twoPlayer') {
            movePlayer(toiletState, { up: keysPressed['arrowup'], down: keysPressed['arrowdown'], left: keysPressed['arrowleft'], right: keysPressed['arrowright'] });
        }
        else if (currentGameMode === 'onePlayer') {
            moveAiToilet();
        }
        checkItemCollisions(pooState);
        checkItemCollisions(toiletState);
        if (checkWinCondition()) {
            endGame();
        }
    }

    function endGame() {
        if (!gameLoopInterval) return; // Prevent double execution
        // console.log("Game Over!");
        elapsedTime = ((Date.now() - startTime) / 1000);

        clearInterval(gameLoopInterval); gameLoopInterval = null;
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }

        winSound.currentTime = 0;
        winSound.play().catch(e => console.error("Sound error:", e));

        let timeText = '';
        let scoreText = '';
        if (currentGameMode === 'onePlayer') {
            timeText = `Survived for ${elapsedTime.toFixed(1)} seconds!`;
            scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`;
        } else { // Two Player
            timeText = '';
            scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`;
        }

        // Set text content
        if (finalTimeDisplay) { finalTimeDisplay.textContent = timeText; } else { console.error("ERROR: finalTimeDisplay is null!"); }
        if (finalScoreDisplay) { finalScoreDisplay.textContent = scoreText; } else { console.error("ERROR: finalScoreDisplay is null!"); }

        // Show Game Over Screen
        // console.log("Attempting to show gameOverScreen. Element is:", gameOverScreen);
        if (gameOverScreen) {
             gameOverScreen.style.display = 'flex';
             // console.log("Set gameOverScreen display to flex. Current computed style:", window.getComputedStyle(gameOverScreen).display);
         } else { console.error("ERROR: gameOverScreen is null!"); }

        // Hide Game Area
        if (gameArea) { gameArea.style.display = 'none'; }

        // console.log("endGame function finished");
    }

    // --- Event Listeners ---
    startOnePlayerButton.addEventListener('click', () => {
        selectedDifficulty = parseInt(difficultySelect.value) || 4;
        currentGameMode = 'onePlayer';
        initGame();
    });
    startTwoPlayerButton.addEventListener('click', () => {
        currentGameMode = 'twoPlayer';
        initGame();
    });
    restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        // Clear intervals defensively
        if (gameLoopInterval) clearInterval(gameLoopInterval); gameLoopInterval = null;
        if (gameTimerInterval) clearInterval(gameTimerInterval); gameTimerInterval = null;
    });
    document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

    // --- Initial Setup ---
    startScreen.style.display = 'flex';
    gameArea.style.display = 'none';
    gameOverScreen.style.display = 'none';
    timerDisplay.style.display = 'none';
    scoreDisplayContainer.style.display = 'none';

}); // End DOMContentLoaded
// --- END OF FILE script.js ---
