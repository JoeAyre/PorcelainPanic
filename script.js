// --- MARSHALL - what are you nosing around in here for? KRAPMAN's comin' to get ya! ---
// --- START OF FILE script.js ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const splashScreen = document.getElementById('splash-screen');
    const splashPlayButton = document.getElementById('splash-play-button');
    const splashMusicButton = document.getElementById('splash-music-button'); // Music Button
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
    const timerDisplay = document.getElementById('timer-display');
    const finalTimeDisplay = document.getElementById('final-time');
    const pooScoreDisplay = document.getElementById('poo-score-display');
    const toiletScoreDisplay = document.getElementById('toilet-score-display');
    const finalScoreDisplay = document.getElementById('final-score');
    const scoreDisplayContainer = document.getElementById('score-display-container');
    const levelDisplay = document.getElementById('level-display');
    const levelUpOverlay = document.getElementById('level-up-overlay');
    // --- Sound Elements ---
    const winSound = document.getElementById('win-sound');
    const pooCollectSound = document.getElementById('poo-collect-sound');
    const toiletCollectSound = document.getElementById('toilet-collect-sound');
    const levelUpSound = document.getElementById('level-up-sound');
    const paperCollectSound = document.getElementById('paper-collect-sound');
    const introSound = document.getElementById('intro-sound'); // Intro sound element

    // --- Game Configuration ---
    const WALL_SPEED = 1.5;
    const PLAYER_SIZE = 30;
    const ITEM_SIZE = 25;
    const POWERUP_DURATION = 3000;
    const DEBUFF_DURATION = 4000;
    const EFFECT_FLASH_DURATION = 500;
    const GAME_LOOP_INTERVAL_MS = 50;
    const AI_MISTAKE_CHANCE = 0.15;
    const AI_RANDOM_MOVE_SCALE = 0.5;
    const difficultySpeeds = { 1: 5.0, 2: 4.8, 3: 4.6, 4: 4.3, 5: 4.0, 6: 3.7, 7: 3.4 };
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
    let currentLevel = 1;
    let levelOverlayTimeout = null;

    // Wall definitions
    const initialWallConfigurations = [
        { x: 0, y: 100, width: 200, height: 20 }, { x: 300, y: 100, width: 300, height: 20 },
        { x: 100, y: 250, width: 400, height: 20 }, { x: 0, y: 400, width: 500, height: 20 },
        { x: 180, y: 120, width: 20, height: 150 }, { x: 480, y: 270, width: 20, height: 150 }
    ];

    // --- Helper Functions ---
    function safePlaySound(soundElement) {
        if (soundElement && typeof soundElement.play === 'function') {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => console.warn("Sound play failed:", e));
        }
    }

    function safeStopSound(soundElement) {
        if (soundElement && typeof soundElement.pause === 'function') {
            soundElement.pause();
            soundElement.currentTime = 0; // Rewind to start
        }
    }

    function positionElement(element, x, y) {
        if (!element) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    function getRelativeRect(element) {
        if (!element) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        const gameAreaRect = gameArea?.getBoundingClientRect();
        if (!gameAreaRect) return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        return { left: rect.left - gameAreaRect.left, top: rect.top - gameAreaRect.top, right: rect.right - gameAreaRect.left, bottom: rect.bottom - gameAreaRect.top, width: rect.width, height: rect.height };
    }

    function checkCollision(rect1, rect2) {
        if (!rect1 || !rect2 || typeof rect1.left === 'undefined' || typeof rect2.left === 'undefined') { return false; }
        return ( rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top );
    }

    function getPlayerRect(playerState) {
        if (!playerState) return null;
        return { left: playerState.x, top: playerState.y, right: playerState.x + PLAYER_SIZE, bottom: playerState.y + PLAYER_SIZE, width: PLAYER_SIZE, height: PLAYER_SIZE };
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
        if (!gameArea) return;
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
        const pooRect = getPlayerRect(pooState);
        const toiletRect = getPlayerRect(toiletState);
        if (!pooRect || !toiletRect) return false;
        return checkCollision(pooRect, toiletRect);
    }

    function calculateCollisionAdjustedPosition(objectState, dx, dy) {
        if (!objectState) return { x: 0, y: 0 };
        let nextX = objectState.x + dx;
        let nextY = objectState.y + dy;
        const objectSize = PLAYER_SIZE;
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;

        nextX = Math.max(0, Math.min(validGameWidth - objectSize, nextX));
        nextY = Math.max(0, Math.min(validGameHeight - objectSize, nextY));

        const potentialRect = { left: nextX, top: nextY, right: nextX + objectSize, bottom: nextY + objectSize };
        let collisionX = false;
        let collisionY = false;

        wallsState.forEach(wall => {
            if (!wall || typeof wall.x === 'undefined') return;
            const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height };
            if (checkCollision(potentialRect, wallRect)) {
                const currentRect = getPlayerRect(objectState);
                if (!currentRect) return;
                const potentialRectX = { ...currentRect, left: nextX, right: nextX + objectSize };
                if (dx !== 0 && checkCollision(potentialRectX, wallRect)) { collisionX = true; }
                const potentialRectY = { ...currentRect, top: nextY, bottom: nextY + objectSize };
                if (dy !== 0 && checkCollision(potentialRectY, wallRect)) { collisionY = true; }
            }
        });

        let finalX = collisionX ? objectState.x : nextX;
        let finalY = collisionY ? objectState.y : nextY;
        finalX = Math.max(0, Math.min(validGameWidth - objectSize, finalX));
        finalY = Math.max(0, Math.min(validGameHeight - objectSize, finalY));
        return { x: finalX, y: finalY };
    }

    function movePlayer(playerState, moveKeys) {
        if (!playerState || !playerState.element) return;
        let dx = 0; let dy = 0;
        if (moveKeys.up) dy -= playerState.speed;
        if (moveKeys.down) dy += playerState.speed;
        if (moveKeys.left) dx -= playerState.speed;
        if (moveKeys.right) dx += playerState.speed;
        if (dx !== 0 && dy !== 0) { const factor = playerState.speed / Math.sqrt(dx * dx + dy * dy); dx *= factor; dy *= factor; }
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
        if (!gameArea) return;
        const safeLevel = Math.max(1, Math.floor(level || 1));
        const backgroundIndex = (safeLevel - 1) % levelBackgrounds.length;
        gameArea.style.background = levelBackgrounds[backgroundIndex];
    }

    // --- Update Display Function ---
    function updateGameStatusDisplay() {
        if (pooScoreDisplay) pooScoreDisplay.textContent = `💩: ${pooScore}`;
        if (toiletScoreDisplay) toiletScoreDisplay.textContent = `🚽: ${toiletScore}`;
        if (levelDisplay) levelDisplay.textContent = `Lvl: ${currentLevel}`;
    }

    // --- Show Level Overlay Function ---
    function showLevelOverlay(levelToShow) {
        if (!levelUpOverlay) return;
        clearTimeout(levelOverlayTimeout);
        levelUpOverlay.textContent = `LEVEL ${levelToShow}`;
        levelUpOverlay.classList.add('visible');
        levelOverlayTimeout = setTimeout(() => {
            if (levelUpOverlay) { levelUpOverlay.classList.remove('visible'); }
        }, 2000); // Show for 2 seconds
    }

    // --- Player State / Item Logic ---
    function resetPlayerState(playerState, startX, startY) {
        if (!playerState || !playerState.element) return;
        playerState.x = startX; playerState.y = startY;
        playerState.isSlowed = false; playerState.isPoweredUp = false;
        playerState.element.style.opacity = '1'; playerState.element.style.filter = 'none';
        positionElement(playerState.element, playerState.x, playerState.y);
        // Speed is set in initGame
    }

    function applyDebuff(playerState, type) {
        if (!playerState || !playerState.element) return;
        if (type === 'slow' && !playerState.isSlowed) {
            playerState.isSlowed = true;
            playerState.speed = playerState.baseSpeed * 0.5;
            playerState.element.style.opacity = '0.6';
            clearTimeout(playerState.debuffTimer);
            playerState.debuffTimer = setTimeout(() => {
                if (playerState && playerState.isSlowed) {
                    playerState.speed = playerState.isPoweredUp ? playerState.baseSpeed * 1.5 : playerState.baseSpeed;
                    playerState.element.style.opacity = '1';
                    playerState.isSlowed = false;
                }
            }, DEBUFF_DURATION);
        }
    }

    function applyPowerup(playerState, type) {
        if (!playerState || !playerState.element) return;
        playerState.isPoweredUp = true;
        playerState.speed = playerState.baseSpeed * 1.5;
        playerState.element.style.filter = 'brightness(1.5)';
        playerState.element.style.opacity = '1';
        if (type === 'food') { showBigPooEffect(); }
        else if (type === 'flush') { showWaterfallEffect(); }
        clearTimeout(playerState.powerupTimer);
        playerState.powerupTimer = setTimeout(() => {
            if (playerState && playerState.isPoweredUp) {
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
            console.warn(`Respawn ${itemElement?.id || 'item'} fail after ${maxAttempts} attempts.`);
            setTimeout(() => respawnItem(itemElement, 1), 5000 + Math.random() * 5000);
            return;
        }
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;
        const randomX = Math.random() * (validGameWidth - ITEM_SIZE);
        const randomY = Math.random() * (validGameHeight - ITEM_SIZE);
        const potentialItemRect = { left: randomX, top: randomY, right: randomX + ITEM_SIZE, bottom: randomY + ITEM_SIZE, width: ITEM_SIZE, height: ITEM_SIZE };
        let overlap = false;
        // Check Walls
        wallsState.forEach(wall => { if (!wall || typeof wall.x === 'undefined') return; const wallRect = { left: wall.x, top: wall.y, right: wall.x + wall.width, bottom: wall.y + wall.height }; const bufferedWallRect = { left: wallRect.left - (ITEM_SIZE / 2), top: wallRect.top - (ITEM_SIZE / 2), right: wallRect.right + (ITEM_SIZE / 2), bottom: wallRect.bottom + (ITEM_SIZE / 2) }; if (checkCollision(potentialItemRect, bufferedWallRect)) { overlap = true; } });
        // Check Players
        if (!overlap && (checkCollision(potentialItemRect, getPlayerRect(pooState)) || checkCollision(potentialItemRect, getPlayerRect(toiletState)))) { overlap = true; }
        // Check Other Items
        if (!overlap) { [toiletPaper, food, flush].forEach(otherItem => { if (itemElement !== otherItem && otherItem && otherItem.style.display !== 'none') { const otherItemRect = getItemRect(otherItem); if (checkCollision(potentialItemRect, otherItemRect)) { overlap = true; } } }); }
        // Place or Retry
        if (!overlap) { if (itemElement) { positionElement(itemElement, randomX, randomY); itemElement.style.display = 'block'; } }
        else { requestAnimationFrame(() => respawnItem(itemElement, attempt + 1)); }
    }

    // --- Wall Initialization / Movement ---
    function initializeWalls() {
        if (!gameArea) return;
        wallsState.forEach(w => { if (w.element && w.element.parentNode === gameArea) { gameArea.removeChild(w.element); } });
        wallsState = [];
        initialWallConfigurations.forEach(config => {
            if (typeof config?.x !== 'number' || typeof config?.y !== 'number' || typeof config?.width !== 'number' || typeof config?.height !== 'number') { console.warn("Skip invalid wall config:", config); return; }
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
    }

    function moveWalls() {
        const validGameWidth = typeof GAME_WIDTH === 'number' ? GAME_WIDTH : 600;
        const validGameHeight = typeof GAME_HEIGHT === 'number' ? GAME_HEIGHT : 500;
        wallsState.forEach(wall => {
            if (!wall || !wall.element) return;
            let nextX = wall.x + wall.dx;
            let nextY = wall.y + wall.dy;
            if (nextX < 0 || nextX + wall.width > validGameWidth) { wall.dx *= -1; nextX = wall.x + wall.dx; nextX = Math.max(0, Math.min(validGameWidth - wall.width, nextX)); }
            if (nextY < 0 || nextY + wall.height > validGameHeight) { wall.dy *= -1; nextY = wall.y + wall.dy; nextY = Math.max(0, Math.min(validGameHeight - wall.height, nextY)); }
            wall.x = nextX; wall.y = nextY;
            positionElement(wall.element, wall.x, wall.y);
        });
    }

    // --- Level Up Logic ---
    function levelUp(newLevel) {
        if (!Number.isInteger(newLevel) || currentLevel >= newLevel) return;
        currentLevel = newLevel;
        // Sound played in checkItemCollisions now
        showLevelOverlay(currentLevel);
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);
        if (currentGameMode === 'onePlayer' && toiletState) {
            const speedIncrement = 0.18;
            toiletState.baseSpeed += speedIncrement;
            if (toiletState.isPoweredUp) { toiletState.speed = toiletState.baseSpeed * 1.5; }
            else if (toiletState.isSlowed) { toiletState.speed = toiletState.baseSpeed * 0.5; }
            else { toiletState.speed = toiletState.baseSpeed; }
        }
    }

    // --- AI Movement Logic ---
    function moveAiToilet() {
        if (!toiletState || !pooState || !flush) return;
        let dx = 0; let dy = 0;
        let targetX = pooState.x; let targetY = pooState.y;
        const currentX = toiletState.x; const currentY = toiletState.y;
        const isFlushVisible = flush.style.display !== 'none';
        const canUseFlush = isFlushVisible && !toiletState.isPoweredUp;

        if (canUseFlush) {
            const flushRect = getItemRect(flush);
            if (flushRect && typeof flushRect.left === 'number') {
                const flushTargetX = flushRect.left + ITEM_SIZE / 2;
                const flushTargetY = flushRect.top + ITEM_SIZE / 2;
                const distSqToPoo = (pooState.x - currentX) ** 2 + (pooState.y - currentY) ** 2;
                const distSqToFlush = (flushTargetX - currentX) ** 2 + (flushTargetY - currentY) ** 2;
                if (distSqToFlush < distSqToPoo) { targetX = flushTargetX; targetY = flushTargetY; }
            }
        }

        const diffX = targetX - currentX; const diffY = targetY - currentY;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        let moveTowardsTarget = true;

        if (Math.random() < AI_MISTAKE_CHANCE) {
            if (Math.random() < 0.3) { moveTowardsTarget = false; }
            else { dx = (Math.random() - 0.5) * 2 * toiletState.speed * AI_RANDOM_MOVE_SCALE; dy = (Math.random() - 0.5) * 2 * toiletState.speed * AI_RANDOM_MOVE_SCALE; moveTowardsTarget = false; }
        }

        if (moveTowardsTarget && distance > PLAYER_SIZE / 4) {
            if (distance > 0) { dx = (diffX / distance) * toiletState.speed; dy = (diffY / distance) * toiletState.speed; }
            else { dx = 0; dy = 0; }
        } else if (!moveTowardsTarget && dx === 0 && dy === 0) { dx = 0; dy = 0; }

        const finalPos = calculateCollisionAdjustedPosition(toiletState, dx, dy);
        toiletState.x = finalPos.x;
        toiletState.y = finalPos.y;
        positionElement(toiletState.element, toiletState.x, toiletState.y);
    }

    // --- Item Collision (Plays Sounds) ---
    function checkItemCollisions(playerState) {
        if (!playerState) return;
        const playerRect = getPlayerRect(playerState);
        if (!playerRect) return;
        let scoreChanged = false;

        // Check Toilet Paper
        if (toiletPaper && toiletPaper.style.display !== 'none') {
            const itemRect = getItemRect(toiletPaper);
            if (checkCollision(playerRect, itemRect)) {
                safePlaySound(paperCollectSound); // Play Paper Sound
                applyDebuff(playerState, 'slow');
                toiletPaper.style.display = 'none';
                setTimeout(() => respawnItem(toiletPaper), 5000);
            }
        }
        // Check Food (Poo only)
        if (playerState.element.id === 'poo' && food && food.style.display !== 'none') {
            const itemRect = getItemRect(food);
            if (checkCollision(playerRect, itemRect)) {
                safePlaySound(pooCollectSound); // Play Poo Collect Sound FIRST
                applyPowerup(playerState, 'food');
                pooScore++; scoreChanged = true;
                const targetLevel = Math.floor(pooScore / 5) + 1;
                if (targetLevel > currentLevel) {
                    levelUp(targetLevel); // Level up handles visuals & speed
                    safePlaySound(levelUpSound); // PLAY LEVEL UP SOUND HERE
                }
                food.style.display = 'none';
                setTimeout(() => respawnItem(food), 8000);
            }
        }
        // Check Flush (Toilet only)
        if (playerState.element.id === 'toilet' && flush && flush.style.display !== 'none') {
            const itemRect = getItemRect(flush);
            if (checkCollision(playerRect, itemRect)) {
                safePlaySound(toiletCollectSound); // Play Toilet Collect Sound
                applyPowerup(playerState, 'flush');
                toiletScore++; scoreChanged = true;
                flush.style.display = 'none';
                setTimeout(() => respawnItem(flush), 8000);
            }
        }
        if (scoreChanged) { updateGameStatusDisplay(); }
    }

    function placeItems() {
        if (toiletPaper) respawnItem(toiletPaper);
        if (food) respawnItem(food);
        if (flush) respawnItem(flush);
    }

    // --- Timer Update ---
    function updateTimerDisplay() {
        if (!gameLoopInterval || !timerDisplay) return;
        const now = Date.now();
        const validStartTime = typeof startTime === 'number' ? startTime : now;
        const currentElapsedTime = ((now - validStartTime) / 1000).toFixed(1);
        timerDisplay.textContent = `Time: ${currentElapsedTime}s`;
    }

    // --- Core Game Initialization and Loop ---
    function initGame() {
        if (!startScreen || !gameOverScreen || !gameArea || !pooState || !toiletState || !difficultySelect) { console.error("CRITICAL ERROR: Cannot initialize game, essential element/state missing!"); return; }
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        if (timerDisplay) timerDisplay.style.display = (currentGameMode === 'onePlayer') ? 'block' : 'none';
        if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'block';
        GAME_WIDTH = gameArea.offsetWidth; GAME_HEIGHT = gameArea.offsetHeight;
        if (GAME_WIDTH === 0 || GAME_HEIGHT === 0) { console.warn("Game area dimensions zero! Falling back."); GAME_WIDTH = 600; GAME_HEIGHT = 500; }
        keysPressed = {}; pooScore = 0; toiletScore = 0; currentLevel = 1;
        if (currentGameMode === 'onePlayer') { toiletState.baseSpeed = difficultySpeeds[selectedDifficulty] || 4.3; }
        else { toiletState.baseSpeed = DEFAULT_TOILET_SPEED_2P; }
        toiletState.speed = toiletState.baseSpeed;
        resetPlayerState(pooState, initialPooPos.x, initialPooPos.y);
        resetPlayerState(toiletState, initialToiletPos.x, initialToiletPos.y);
        initializeWalls();
        placeItems();
        updateGameStatusDisplay();
        setBackgroundForLevel(currentLevel);
        showLevelOverlay(currentLevel); // Show "Level 1" overlay initially
        if (gameLoopInterval) { clearInterval(gameLoopInterval); gameLoopInterval = null; }
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
        startTime = Date.now(); elapsedTime = 0; updateTimerDisplay(); // Initial timer display
        if (checkWinCondition()) { console.error("Win condition met immediately after init!"); return; }
        gameLoopInterval = setInterval(gameLoop, GAME_LOOP_INTERVAL_MS);
        if (currentGameMode === 'onePlayer') { gameTimerInterval = setInterval(updateTimerDisplay, 100); }
    }

    function gameLoop() {
        moveWalls();
        movePlayer(pooState, { up: keysPressed['w'], down: keysPressed['s'], left: keysPressed['a'], right: keysPressed['d'] });
        if (currentGameMode === 'twoPlayer') { movePlayer(toiletState, { up: keysPressed['arrowup'], down: keysPressed['arrowdown'], left: keysPressed['arrowleft'], right: keysPressed['arrowright'] }); }
        else if (currentGameMode === 'onePlayer') { moveAiToilet(); }
        checkItemCollisions(pooState); checkItemCollisions(toiletState);
        if (checkWinCondition()) { endGame(); }
    }

    function endGame() {
        if (!gameLoopInterval) return;
        const finalElapsedTime = ((Date.now() - startTime) / 1000);
        clearInterval(gameLoopInterval); gameLoopInterval = null;
        if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
        safePlaySound(winSound); // Use safe play
        let timeText = ''; let scoreText = '';
        if (currentGameMode === 'onePlayer') { timeText = `Survived for ${finalElapsedTime.toFixed(1)} seconds!`; }
        scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`;
        if (finalTimeDisplay) { finalTimeDisplay.textContent = timeText; } else { console.error("Cannot display final time - element not found."); }
        if (finalScoreDisplay) { finalScoreDisplay.textContent = scoreText; } else { console.error("Cannot display final score - element not found."); }
        if (gameOverScreen) { gameOverScreen.style.display = 'flex'; } else { console.error("Cannot show game over screen - element not found."); }
        if (gameArea) { gameArea.style.display = 'none'; }
    }

    // --- Event Listeners ---
    // Splash Screen Buttons
    if (splashMusicButton) {
        splashMusicButton.addEventListener('click', () => {
            if (introSound) {
                // Toggle play/pause
                if (introSound.paused) {
                    introSound.play().then(() => {
                         if (splashMusicButton) splashMusicButton.classList.add('playing');
                    }).catch(e => console.warn("Manual intro sound play failed:", e));
                } else {
                    introSound.pause(); // Pause only
                    if (splashMusicButton) splashMusicButton.classList.remove('playing');
                }
            }
        });
    } else { console.error("Splash Music button not found!"); }

    if (splashPlayButton) {
        splashPlayButton.addEventListener('click', () => {
            // Always stop intro sound when starting game
            safeStopSound(introSound);
            if (splashMusicButton) splashMusicButton.classList.remove('playing');

            // Hide splash, show start menu
            if (splashScreen) splashScreen.style.display = 'none';
            if (startScreen) startScreen.style.display = 'flex';
        });
    } else { console.error("Splash Play button not found!"); }

    // Mode Selection Buttons
    if (startOnePlayerButton) { startOnePlayerButton.addEventListener('click', () => { selectedDifficulty = difficultySelect ? (parseInt(difficultySelect.value) || 4) : 4; currentGameMode = 'onePlayer'; initGame(); }); } else { console.error("Start 1 Player button not found!"); }
    if (startTwoPlayerButton) { startTwoPlayerButton.addEventListener('click', () => { currentGameMode = 'twoPlayer'; initGame(); }); } else { console.error("Start 2 Player button not found!"); }

    // Restart Button
    if (restartButton) { restartButton.addEventListener('click', () => { if (gameOverScreen) gameOverScreen.style.display = 'none'; if (startScreen) startScreen.style.display = 'flex'; if (gameLoopInterval) clearInterval(gameLoopInterval); gameLoopInterval = null; if (gameTimerInterval) clearInterval(gameTimerInterval); gameTimerInterval = null; }); } else { console.error("Restart button not found!"); }

    // Keyboard Input
    document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

    // --- Initial Setup ---
    // Show splash screen first, hide others
    if (splashScreen) splashScreen.style.display = 'flex'; else { console.error("Splash Screen element not found on initial load!"); }
    if (startScreen) startScreen.style.display = 'none';
    if (gameArea) gameArea.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (timerDisplay) timerDisplay.style.display = 'none';
    if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'none';

    // *** REMOVED automatic introSound.play() attempt ***

}); // End DOMContentLoaded
// --- END OF FILE script.js ---