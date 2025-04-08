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
    const levelUpOverlay = document.getElementById('level-up-overlay'); // Level Overlay Element

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
    let selectedDifficulty = 4; // Default difficulty
    let pooScore = 0;
    let toiletScore = 0;
    let currentLevel = 1; // START AT LEVEL 1
    let levelOverlayTimeout = null; // Timer for level overlay visibility

    // Wall definitions
    const initialWallConfigurations = [
        { x: 0, y: 100, width: 200, height: 20 }, { x: 300, y: 100, width: 300, height: 20 },
        { x: 100, y: 250, width: 400, height: 20 }, { x: 0, y: 400, width: 500, height: 20 },
        { x: 180, y: 120, width: 20, height: 150 }, { x: 480, y: 270, width: 20, height: 150 }
    ];

    // --- Helper Functions ---
    function positionElement(element, x, y) {
        if (!element) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    function getRelativeRect(element) {
        if (!element) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        const rect = element.getBoundingClientRect();
        const gameAreaRect = gameArea?.getBoundingClientRect(); // Use optional chaining
        if (!gameAreaRect) return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        return {
            left: rect.left - gameAreaRect.left, top: rect.top - gameAreaRect.top,
            right: rect.right - gameAreaRect.left, bottom: rect.bottom - gameAreaRect.top,
            width: rect.width, height: rect.height
        };
    }

    function checkCollision(rect1, rect2) {
        if (!rect1 || !rect2 || typeof rect1.left === 'undefined' || typeof rect2.left === 'undefined') { return false; }
        return ( rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top );
    }

    function getPlayerRect(playerState) {
        if (!playerState) return null;
        return { left: playerState.x, top: playerState.y, right: playerState.x + PLAYER_SIZE, bottom: playerState.y + PLAYER_SIZE, width: PLAYER_SIZE, height: PLAYER_SIZE };
    }

    function getItemRect(itemElement) { return getRelativeRect(itemElement); }

    function showBigPooEffect() {
        if (!effectOverlay) return;
        effectOverlay.innerHTML = '💩'; effectOverlay.className = 'big-poo'; effectOverlay.style.display = 'flex';
        setTimeout(() => { if (effectOverlay && effectOverlay.classList.contains('big-poo')) { effectOverlay.style.display = 'none'; effectOverlay.innerHTML = ''; effectOverlay.className = ''; } }, EFFECT_FLASH_DURATION);
    }

    function showWaterfallEffect() {
        const n=20,d=350,a=EFFECT_FLASH_DURATION; if(!gameArea) return; for (let i=0;i<n;i++){const e=document.createElement('div'); e.classList.add('water-drop'); e.innerHTML='💧'; const l=Math.random()*100; e.style.left=`${l}%`; const y=Math.random()*d; e.style.animationDelay=`${y}ms`; e.style.animationDuration=`${a}ms`; gameArea.appendChild(e); setTimeout(()=>{if(e.parentNode===gameArea){gameArea.removeChild(e);}},a+y+50);}} // Kept compact as it works

    function checkWinCondition() { const pR=getPlayerRect(pooState), tR=getPlayerRect(toiletState); if (!pR || !tR) return false; return checkCollision(pR, tR); }

    function calculateCollisionAdjustedPosition(objectState, dx, dy) {
        if (!objectState) return { x: 0, y: 0};
        let nX=objectState.x+dx, nY=objectState.y+dy; const oS=PLAYER_SIZE;
        const vGW=typeof GAME_WIDTH==='number'?GAME_WIDTH:600; const vGH=typeof GAME_HEIGHT==='number'?GAME_HEIGHT:500;
        nX=Math.max(0,Math.min(vGW-oS,nX)); nY=Math.max(0,Math.min(vGH-oS,nY));
        const pR={left:nX,top:nY,right:nX+oS,bottom:nY+oS}; let cX=false,cY=false;
        wallsState.forEach(w=>{if(!w||typeof w.x==='undefined')return; const wR={left:w.x,top:w.y,right:w.x+w.width,bottom:w.y+w.height};if(checkCollision(pR,wR)){const cRt=getPlayerRect(objectState);if(!cRt)return; const pRX={...cRt,left:nX,right:nX+oS}; if(dx!==0&&checkCollision(pRX,wR)){cX=true;} const pRY={...cRt,top:nY,bottom:nY+oS}; if(dy!==0&&checkCollision(pRY,wR)){cY=true;}}});
        let fX=cX?objectState.x:nX; let fY=cY?objectState.y:nY;
        fX=Math.max(0,Math.min(vGW-oS,fX)); fY=Math.max(0,Math.min(vGH-oS,fY));
        return {x:fX,y:fY};
    } // Kept compact as it works

    function movePlayer(playerState, moveKeys) {
        if (!playerState || !playerState.element) return;
        let dx=0,dy=0; if(moveKeys.up)dy-=playerState.speed; if(moveKeys.down)dy+=playerState.speed; if(moveKeys.left)dx-=playerState.speed; if(moveKeys.right)dx+=playerState.speed;
        if(dx!==0&&dy!==0){const f=playerState.speed/Math.sqrt(dx*dx+dy*dy); dx*=f; dy*=f;}
        const p=calculateCollisionAdjustedPosition(playerState,dx,dy); playerState.x=p.x; playerState.y=p.y; positionElement(playerState.element,playerState.x,playerState.y);
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
        // Level is 1-based, adjust index for 0-based array
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

    // --- NEW: Show Level Overlay Function ---
    function showLevelOverlay(levelToShow) {
        if (!levelUpOverlay) return;

        clearTimeout(levelOverlayTimeout); // Clear previous timer if any

        levelUpOverlay.textContent = `LEVEL ${levelToShow}`;
        levelUpOverlay.classList.add('visible'); // Add class to make visible (uses CSS opacity transition)

        // Set timeout to hide overlay after a duration
        levelOverlayTimeout = setTimeout(() => {
            if (levelUpOverlay) {
                levelUpOverlay.classList.remove('visible'); // Remove class to fade out
            }
            // No need for second timeout if CSS handles fade out fully
        }, 2000); // Display duration: 2000ms = 2 seconds
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
            playerState.isSlowed = true; playerState.speed = playerState.baseSpeed * 0.5; playerState.element.style.opacity = '0.6';
            clearTimeout(playerState.debuffTimer);
            playerState.debuffTimer = setTimeout(() => { if (playerState && playerState.isSlowed) { playerState.speed = playerState.isPoweredUp ? playerState.baseSpeed * 1.5 : playerState.baseSpeed; playerState.element.style.opacity = '1'; playerState.isSlowed = false; } }, DEBUFF_DURATION);
        }
    }

    function applyPowerup(playerState, type) {
        if (!playerState || !playerState.element) return;
        playerState.isPoweredUp = true; playerState.speed = playerState.baseSpeed * 1.5; playerState.element.style.filter = 'brightness(1.5)'; playerState.element.style.opacity = '1';
        if (type === 'food') { showBigPooEffect(); } else if (type === 'flush') { showWaterfallEffect(); }
        clearTimeout(playerState.powerupTimer);
        playerState.powerupTimer = setTimeout(() => { if (playerState && playerState.isPoweredUp) { playerState.speed = playerState.isSlowed ? playerState.baseSpeed * 0.5 : playerState.baseSpeed; playerState.element.style.filter = 'none'; if (playerState.isSlowed) playerState.element.style.opacity = '0.6'; playerState.isPoweredUp = false; } }, POWERUP_DURATION);
    }

    // Respawn with random placement
    function respawnItem(itemElement, attempt = 1) {
        const mA=10; if(attempt>mA){console.warn(`Respawn ${itemElement?.id||'item'} fail`);setTimeout(()=>respawnItem(itemElement,1),5000+Math.random()*5000);return;} const vGW=typeof GAME_WIDTH==='number'?GAME_WIDTH:600; const vGH=typeof GAME_HEIGHT==='number'?GAME_HEIGHT:500; const rX=Math.random()*(vGW-ITEM_SIZE), rY=Math.random()*(vGH-ITEM_SIZE); const pIR={left:rX,top:rY,right:rX+ITEM_SIZE,bottom:rY+ITEM_SIZE,width:ITEM_SIZE,height:ITEM_SIZE}; let o=false; wallsState.forEach(w=>{if(!w||typeof w.x==='undefined')return;const wR={left:w.x,top:w.y,right:w.x+w.width,bottom:w.y+w.height};const bWR={left:wR.left-(ITEM_SIZE/2),top:wR.top-(ITEM_SIZE/2),right:wR.right+(ITEM_SIZE/2),bottom:wR.bottom+(ITEM_SIZE/2)};if(checkCollision(pIR,bWR)){o=true;}}); if(!o&&(checkCollision(pIR,getPlayerRect(pooState))||checkCollision(pIR,getPlayerRect(toiletState)))){o=true;} if(!o){[toiletPaper,food,flush].forEach(i=>{if(itemElement!==i&&i&&i.style.display!=='none'){const iR=getItemRect(i);if(checkCollision(pIR,iR)){o=true;}}});} if(!o){if(itemElement){positionElement(itemElement,rX,rY);itemElement.style.display='block';}} else {requestAnimationFrame(()=>respawnItem(itemElement,attempt+1));}} // Kept compact

    // --- Wall Initialization / Movement ---
    function initializeWalls() { if (!gameArea) return; wallsState.forEach(w=>{if(w.element&&w.element.parentNode===gameArea){gameArea.removeChild(w.element);}}); wallsState = []; initialWallConfigurations.forEach(c=>{if(typeof c?.x!=='number'||typeof c?.y!=='number'||typeof c?.width!=='number'||typeof c?.height!=='number'){console.warn("Skip invalid wall config:",c);return;}const e=document.createElement('div');e.classList.add('wall');e.style.width=`${c.width}px`;e.style.height=`${c.height}px`;gameArea.appendChild(e);let dx=(Math.random()<0.5?WALL_SPEED:-WALL_SPEED);let dy=(Math.random()<0.5?WALL_SPEED:-WALL_SPEED);const ws={element:e,x:c.x,y:c.y,width:c.width,height:c.height,dx:dx,dy:dy};wallsState.push(ws);positionElement(e,ws.x,ws.y);});} // Kept compact
    function moveWalls() { const vGW=typeof GAME_WIDTH==='number'?GAME_WIDTH:600; const vGH=typeof GAME_HEIGHT==='number'?GAME_HEIGHT:500; wallsState.forEach(w=>{if(!w||!w.element)return; let nX=w.x+w.dx, nY=w.y+w.dy; if(nX<0||nX+w.width>vGW){w.dx*=-1;nX=w.x+w.dx;nX=Math.max(0,Math.min(vGW-w.width,nX));} if(nY<0||nY+w.height>vGH){w.dy*=-1;nY=w.y+w.dy;nY=Math.max(0,Math.min(vGH-w.height,nY));} w.x=nX;w.y=nY;positionElement(w.element,w.x,w.y);});} // Kept compact

    // --- MODIFIED Level Up Logic ---
    function levelUp(newLevel) { // Accept the new level number
        // Prevent processing if level isn't actually increasing or invalid state
        if (!Number.isInteger(newLevel) || currentLevel >= newLevel) return;

        currentLevel = newLevel; // Set the new level
        // console.log(`Level Up! Reached Level ${currentLevel}`);

        showLevelOverlay(currentLevel); // Show visual overlay
        updateGameStatusDisplay();     // Update score/level text
        setBackgroundForLevel(currentLevel); // Change background

        // Increase AI speed in 1P mode
        if (currentGameMode === 'onePlayer' && toiletState) {
            const speedIncrement = 0.18; // How much faster per level
            toiletState.baseSpeed += speedIncrement;
            // Update current speed, respecting powerup/debuff
            if (toiletState.isPoweredUp) { toiletState.speed = toiletState.baseSpeed * 1.5; }
            else if (toiletState.isSlowed) { toiletState.speed = toiletState.baseSpeed * 0.5; }
            else { toiletState.speed = toiletState.baseSpeed; }
            // console.log(`AI Toilet base speed increased to: ${toiletState.baseSpeed.toFixed(2)}`);
        }
        // Optional: Play level up sound effect here
    }

    // --- AI Movement Logic ---
    function moveAiToilet() {
        if (!toiletState || !pooState || !flush) return;
        let dx=0,dy=0;let tX=pooState.x,tY=pooState.y; const cX=toiletState.x,cY=toiletState.y; const isFlushVis=flush.style.display!=='none'; const canUseFlush=isFlushVis&&!toiletState.isPoweredUp;
        if(canUseFlush){const fR=getItemRect(flush);if(fR&&typeof fR.left==='number'){const fTX=fR.left+ITEM_SIZE/2,fTY=fR.top+ITEM_SIZE/2; const dSqP=(pooState.x-cX)**2+(pooState.y-cY)**2; const dSqF=(fTX-cX)**2+(fTY-cY)**2; if(dSqF<dSqP){tX=fTX;tY=fTY;}}}
        const diffX=tX-cX,diffY=tY-cY; const distance=Math.sqrt(diffX*diffX+diffY*diffY); let moveTowardsTarget=true;
        if(Math.random()<AI_MISTAKE_CHANCE){if(Math.random()<0.3){moveTowardsTarget=false;}else{dx=(Math.random()-0.5)*2*toiletState.speed*AI_RANDOM_MOVE_SCALE;dy=(Math.random()-0.5)*2*toiletState.speed*AI_RANDOM_MOVE_SCALE;moveTowardsTarget=false;}}
        if(moveTowardsTarget&&distance>PLAYER_SIZE/4){if(distance>0){dx=(diffX/distance)*toiletState.speed;dy=(diffY/distance)*toiletState.speed;}else{dx=0;dy=0;}}else if(!moveTowardsTarget&&dx===0&&dy===0){dx=0;dy=0;}
        const finalPos=calculateCollisionAdjustedPosition(toiletState,dx,dy); toiletState.x=finalPos.x; toiletState.y=finalPos.y; positionElement(toiletState.element,toiletState.x,toiletState.y);
    } // Kept compact

    // --- MODIFIED Item Collision Logic ---
    function checkItemCollisions(playerState) {
        if (!playerState) return;
        const playerRect = getPlayerRect(playerState);
        if (!playerRect) return;

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

                // Calculate target level and check if it's higher than current
                const targetLevel = Math.floor(pooScore / 5) + 1;
                if (targetLevel > currentLevel) {
                    levelUp(targetLevel); // Pass the new level number
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

        // Update display only if score changed
        if (scoreChanged) {
            updateGameStatusDisplay();
        }
    }

    function placeItems() {
        if (toiletPaper) respawnItem(toiletPaper); if (food) respawnItem(food); if (flush) respawnItem(flush);
    }

    // --- Timer Update ---
    function updateTimerDisplay() {
        if (!gameLoopInterval || !timerDisplay) return;
        const now = Date.now(); const validStartTime = typeof startTime === 'number' ? startTime : now;
        const currentElapsedTime = ((now - validStartTime) / 1000).toFixed(1);
        timerDisplay.textContent = `Time: ${currentElapsedTime}s`;
    }

    // --- Core Game Initialization and Loop ---
    function initGame() {
        if (!startScreen || !gameOverScreen || !gameArea || !pooState || !toiletState || !difficultySelect) { console.error("CRITICAL ERROR: Cannot initialize game, essential element/state missing!"); return; }
        // console.log(`Init Game Mode: ${currentGameMode}, Difficulty: ${selectedDifficulty}`);
        startScreen.style.display = 'none'; gameOverScreen.style.display = 'none'; gameArea.style.display = 'block';
        if (timerDisplay) timerDisplay.style.display = (currentGameMode === 'onePlayer') ? 'block' : 'none';
        if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'block';

        GAME_WIDTH = gameArea.offsetWidth; GAME_HEIGHT = gameArea.offsetHeight;
        if (GAME_WIDTH === 0 || GAME_HEIGHT === 0) { console.warn("Game area dimensions zero! Falling back."); GAME_WIDTH = 600; GAME_HEIGHT = 500; }

        keysPressed = {}; pooScore = 0; toiletScore = 0;
        currentLevel = 1; // START AT LEVEL 1

        if (currentGameMode === 'onePlayer') { toiletState.baseSpeed = difficultySpeeds[selectedDifficulty] || 4.3; }
        else { toiletState.baseSpeed = DEFAULT_TOILET_SPEED_2P; }
        toiletState.speed = toiletState.baseSpeed;

        resetPlayerState(pooState, initialPooPos.x, initialPooPos.y);
        resetPlayerState(toiletState, initialToiletPos.x, initialToiletPos.y);
        initializeWalls(); placeItems();
        updateGameStatusDisplay(); // Update score/level display (now shows Lvl: 1)
        setBackgroundForLevel(currentLevel); // Set background for Level 1
        showLevelOverlay(currentLevel); // SHOW LEVEL 1 OVERLAY

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
        clearInterval(gameLoopInterval); gameLoopInterval = null; if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
        if (winSound) { winSound.currentTime = 0; winSound.play().catch(e => console.warn("Sound play failed:", e)); }
        let timeText = ''; let scoreText = '';
        if (currentGameMode === 'onePlayer') { timeText = `Survived for ${finalElapsedTime.toFixed(1)} seconds!`; }
        scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`; // Always show score/level
        if (finalTimeDisplay) { finalTimeDisplay.textContent = timeText; } else { console.error("Cannot display final time - element not found."); }
        if (finalScoreDisplay) { finalScoreDisplay.textContent = scoreText; } else { console.error("Cannot display final score - element not found."); }
        if (gameOverScreen) { gameOverScreen.style.display = 'flex'; } else { console.error("Cannot show game over screen - element not found."); }
        if (gameArea) { gameArea.style.display = 'none'; }
    }

    // --- Event Listeners ---
    if (startOnePlayerButton) { startOnePlayerButton.addEventListener('click', () => { selectedDifficulty = difficultySelect ? (parseInt(difficultySelect.value) || 4) : 4; currentGameMode = 'onePlayer'; initGame(); }); } else { console.error("Start 1 Player button not found!"); }
    if (startTwoPlayerButton) { startTwoPlayerButton.addEventListener('click', () => { currentGameMode = 'twoPlayer'; initGame(); }); } else { console.error("Start 2 Player button not found!"); }
    if (restartButton) { restartButton.addEventListener('click', () => { if (gameOverScreen) gameOverScreen.style.display = 'none'; if (startScreen) startScreen.style.display = 'flex'; if (gameLoopInterval) clearInterval(gameLoopInterval); gameLoopInterval = null; if (gameTimerInterval) clearInterval(gameTimerInterval); gameTimerInterval = null; }); } else { console.error("Restart button not found!"); }
    document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

    // --- Initial Setup ---
    if (startScreen) startScreen.style.display = 'flex';
    if (gameArea) gameArea.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (timerDisplay) timerDisplay.style.display = 'none';
    if (scoreDisplayContainer) scoreDisplayContainer.style.display = 'none';

}); // End DOMContentLoaded
// --- END OF FILE script.js ---
