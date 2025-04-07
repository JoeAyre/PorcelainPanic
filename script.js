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
    let selectedDifficulty = 4;
    let pooScore = 0;
    let toiletScore = 0;
    let currentLevel = 0;

    // Wall definitions
    const initialWallConfigurations = [ { x: 0,   y: 100, width: 200, height: 20 }, { x: 300, y: 100, width: 300, height: 20 }, { x: 100, y: 250, width: 400, height: 20 }, { x: 0,   y: 400, width: 500, height: 20 }, { x: 180, y: 120, width: 20,  height: 150 }, { x: 480, y: 270, width: 20,  height: 150 } ];

    // --- Helper Functions ---
    function positionElement(element, x, y) { element.style.left = `${x}px`; element.style.top = `${y}px`; }
    function getRelativeRect(element) { const r = element.getBoundingClientRect(), gr = gameArea.getBoundingClientRect(); return { left: r.left - gr.left, top: r.top - gr.top, right: r.right - gr.left, bottom: r.bottom - gr.top, width: r.width, height: r.height }; }
    function checkCollision(rect1, rect2) { return ( rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top ); }
    function getPlayerRect(playerState) { return { left: playerState.x, top: playerState.y, right: playerState.x + PLAYER_SIZE, bottom: playerState.y + PLAYER_SIZE, width: PLAYER_SIZE, height: PLAYER_SIZE }; }
    function getItemRect(itemElement) { return getRelativeRect(itemElement); }
    function showBigPooEffect() { effectOverlay.innerHTML = '💩'; effectOverlay.className = 'big-poo'; effectOverlay.style.display = 'flex'; setTimeout(() => { if (effectOverlay.classList.contains('big-poo')) { effectOverlay.style.display = 'none'; effectOverlay.innerHTML = ''; effectOverlay.className = ''; } }, EFFECT_FLASH_DURATION); }
    function showWaterfallEffect() { const n=20,d=350,a=EFFECT_FLASH_DURATION; for (let i=0;i<n;i++){const e=document.createElement('div'); e.classList.add('water-drop'); e.innerHTML='💧'; const l=Math.random()*100; e.style.left=`${l}%`; const y=Math.random()*d; e.style.animationDelay=`${y}ms`; e.style.animationDuration=`${a}ms`; gameArea.appendChild(e); setTimeout(()=>{if(e.parentNode===gameArea){gameArea.removeChild(e);}},a+y+50);}}
    function checkWinCondition() { return checkCollision(getPlayerRect(pooState), getPlayerRect(toiletState)); }
    function calculateCollisionAdjustedPosition(objectState, dx, dy) { let nX=objectState.x+dx,nY=objectState.y+dy;const oS=PLAYER_SIZE; nX=Math.max(0,Math.min(GAME_WIDTH-oS,nX)); nY=Math.max(0,Math.min(GAME_HEIGHT-oS,nY)); const pR={left:nX,top:nY,right:nX+oS,bottom:nY+oS}; let cX=false,cY=false; wallsState.forEach(w=>{const wR={left:w.x,top:w.y,right:w.x+w.width,bottom:w.y+w.height};if(checkCollision(pR,wR)){const cR={left:objectState.x,top:objectState.y,right:objectState.x+oS,bottom:objectState.y+oS};const pRX={...cR,left:nX,right:nX+oS};if(dx!==0&&checkCollision(pRX,wR)){cX=true;}const pRY={...cR,top:nY,bottom:nY+oS};if(dy!==0&&checkCollision(pRY,wR)){cY=true;}}}); let fX=cX?objectState.x:nX; let fY=cY?objectState.y:nY; fX=Math.max(0,Math.min(GAME_WIDTH-oS,fX)); fY=Math.max(0,Math.min(GAME_HEIGHT-oS,fY)); return {x:fX,y:fY}; }
    function movePlayer(playerState, moveKeys) { let dx=0,dy=0;if(moveKeys.up)dy-=playerState.speed;if(moveKeys.down)dy+=playerState.speed;if(moveKeys.left)dx-=playerState.speed;if(moveKeys.right)dx+=playerState.speed;if(dx!==0&&dy!==0){const f=playerState.speed/Math.sqrt(dx*dx+dy*dy);dx*=f;dy*=f;}const p=calculateCollisionAdjustedPosition(playerState,dx,dy);playerState.x=p.x;playerState.y=p.y;positionElement(playerState.element,playerState.x,playerState.y);}

    // --- Background/Level Functions ---
    const levelBackgrounds = [ 'linear-gradient(45deg, #2a2a4a, #4a2a4a)', 'linear-gradient(45deg, #4a2a2a, #4a4a2a)', 'linear-gradient(45deg, #2a4a2a, #2a4a4a)', 'linear-gradient(45deg, #2a2a4a, #2a4a2a)', 'linear-gradient(60deg, #5a3a5a, #3a3a5a)', 'linear-gradient(60deg, #634f34, #4a4a2a)', 'linear-gradient(75deg, #223344, #443322)' ];
    function setBackgroundForLevel(level) { const bI = level % levelBackgrounds.length; gameArea.style.background = levelBackgrounds[bI]; }

    // --- Update Display Function ---
    function updateGameStatusDisplay() { pooScoreDisplay.textContent = `💩: ${pooScore}`; toiletScoreDisplay.textContent = `🚽: ${toiletScore}`; levelDisplay.textContent = `Lvl: ${currentLevel}`; }

    // --- Player State / Item Logic ---
    function resetPlayerState(playerState, startX, startY) { playerState.x = startX; playerState.y = startY; playerState.isSlowed = false; playerState.isPoweredUp = false; playerState.element.style.opacity = '1'; playerState.element.style.filter = 'none'; positionElement(playerState.element, playerState.x, playerState.y); } // Speed set in initGame
    function applyDebuff(playerState, type) { if (type === 'slow' && !playerState.isSlowed) { playerState.isSlowed = true; playerState.speed = playerState.baseSpeed * 0.5; playerState.element.style.opacity = '0.6'; clearTimeout(playerState.debuffTimer); playerState.debuffTimer = setTimeout(() => { if (playerState.isSlowed) { playerState.speed = playerState.isPoweredUp ? playerState.baseSpeed * 1.5 : playerState.baseSpeed; playerState.element.style.opacity = '1'; playerState.isSlowed = false; } }, DEBUFF_DURATION); } }
    function applyPowerup(playerState, type) { playerState.isPoweredUp = true; playerState.speed = playerState.baseSpeed * 1.5; playerState.element.style.filter = 'brightness(1.5)'; playerState.element.style.opacity = '1'; if (type === 'food') { showBigPooEffect(); } else if (type === 'flush') { showWaterfallEffect(); } clearTimeout(playerState.powerupTimer); playerState.powerupTimer = setTimeout(() => { if (playerState.isPoweredUp) { playerState.speed = playerState.isSlowed ? playerState.baseSpeed * 0.5 : playerState.baseSpeed; playerState.element.style.filter = 'none'; if (playerState.isSlowed) playerState.element.style.opacity = '0.6'; playerState.isPoweredUp = false; } }, POWERUP_DURATION); }
    function respawnItem(itemElement, attempt = 1) { const mA=10; if(attempt>mA){console.warn(`Respawn ${itemElement.id} fail`);setTimeout(()=>respawnItem(itemElement, 1), 5000+Math.random()*5000); return;} const rX=Math.random()*(GAME_WIDTH-ITEM_SIZE), rY=Math.random()*(GAME_HEIGHT-ITEM_SIZE); const pIR={left:rX,top:rY,right:rX+ITEM_SIZE,bottom:rY+ITEM_SIZE,width:ITEM_SIZE,height:ITEM_SIZE}; let o=false; wallsState.forEach(w=>{const wR={left:w.x,top:w.y,right:w.x+w.width,bottom:w.y+w.height}; const bWR={left:wR.left-(ITEM_SIZE/2),top:wR.top-(ITEM_SIZE/2),right:wR.right+(ITEM_SIZE/2),bottom:wR.bottom+(ITEM_SIZE/2)}; if(checkCollision(pIR,bWR)){o=true;}}); if(checkCollision(pIR,getPlayerRect(pooState))||checkCollision(pIR,getPlayerRect(toiletState))){o=true;} [toiletPaper,food,flush].forEach(i=>{if(itemElement!==i && i.style.display!=='none'){if(checkCollision(pIR,getItemRect(i))){o=true;}}}); if(!o){positionElement(itemElement,rX,rY);itemElement.style.display='block';} else {requestAnimationFrame(()=>respawnItem(itemElement,attempt+1));}}

    // --- Wall Initialization / Movement ---
    function initializeWalls() { wallsState.forEach(w=>w.element.remove()); wallsState=[]; initialWallConfigurations.forEach(c=>{const e=document.createElement('div'); e.classList.add('wall'); e.style.width=`${c.width}px`; e.style.height=`${c.height}px`; gameArea.appendChild(e); let dx=(Math.random()<0.5?WALL_SPEED:-WALL_SPEED); let dy=(Math.random()<0.5?WALL_SPEED:-WALL_SPEED); const ws={element:e,x:c.x,y:c.y,width:c.width,height:c.height,dx:dx,dy:dy}; wallsState.push(ws); positionElement(e,ws.x,ws.y);}); /*console.log(`Initialized ${wallsState.length} walls.`);*/ }
    function moveWalls() { wallsState.forEach(w=>{let nX=w.x+w.dx,nY=w.y+w.dy; if(nX<0||nX+w.width>GAME_WIDTH){w.dx*=-1;nX=w.x+w.dx;nX=Math.max(0,Math.min(GAME_WIDTH-w.width,nX));} if(nY<0||nY+w.height>GAME_HEIGHT){w.dy*=-1;nY=w.y+w.dy;nY=Math.max(0,Math.min(GAME_HEIGHT-w.height,nY));} w.x=nX;w.y=nY;positionElement(w.element,w.x,w.y);}); }

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
    function moveAiToilet() { let dx=0,dy=0;let tX=pooState.x,tY=pooState.y;const cX=toiletState.x,cY=toiletState.y;const isFlushVis=flush.style.display!=='none';const canUseFlush=isFlushVis&&!toiletState.isPoweredUp;if(canUseFlush){const fR=getItemRect(flush);const fTX=fR.left+ITEM_SIZE/2,fTY=fR.top+ITEM_SIZE/2;const dSqP=(pooState.x-cX)**2+(pooState.y-cY)**2;const dSqF=(fTX-cX)**2+(fTY-cY)**2;if(dSqF<dSqP){tX=fTX;tY=fTY;}}const diffX=tX-cX,diffY=tY-cY;const dist=Math.sqrt(diffX*diffX+diffY*diffY);let moveTowardsTarget=true;if(Math.random()<AI_MISTAKE_CHANCE){if(Math.random()<0.3){moveTowardsTarget=false;}else{dx=(Math.random()-0.5)*2*toiletState.speed*AI_RANDOM_MOVE_SCALE;dy=(Math.random()-0.5)*2*toiletState.speed*AI_RANDOM_MOVE_SCALE;moveTowardsTarget=false;}}if(moveTowardsTarget&&dist>PLAYER_SIZE/4){dx=(diffX/dist)*toiletState.speed;dy=(diffY/dist)*toiletState.speed;}else if(!moveTowardsTarget&&dx===0&&dy===0){dx=0;dy=0;}const finalPos=calculateCollisionAdjustedPosition(toiletState,dx,dy);toiletState.x=finalPos.x;toiletState.y=finalPos.y;positionElement(toiletState.element,toiletState.x,toiletState.y);}

    // --- Item Collision & Initial Placement ---
    function checkItemCollisions(playerState) { const pR=getPlayerRect(playerState);let sC=false; if(toiletPaper.style.display!=='none'&&checkCollision(pR,getItemRect(toiletPaper))){applyDebuff(playerState,'slow');toiletPaper.style.display='none';setTimeout(()=>respawnItem(toiletPaper),5000);} if(playerState.element.id==='poo'&&food.style.display!=='none'&&checkCollision(pR,getItemRect(food))){applyPowerup(playerState,'food');pooScore++;sC=true;if(pooScore>0&&pooScore%5===0){levelUp();}food.style.display='none';setTimeout(()=>respawnItem(food),8000);} if(playerState.element.id==='toilet'&&flush.style.display!=='none'&&checkCollision(pR,getItemRect(flush))){applyPowerup(playerState,'flush');toiletScore++;sC=true;flush.style.display='none';setTimeout(()=>respawnItem(flush),8000);} if(sC){updateGameStatusDisplay();}}
    function placeItems() { respawnItem(toiletPaper); respawnItem(food); respawnItem(flush); }

    // --- Timer Update ---
    function updateTimerDisplay() { if (!gameLoopInterval) return; const now = Date.now(); const cET = ((now - startTime) / 1000).toFixed(1); timerDisplay.textContent = `Time: ${cET}s`; }

    // --- Core Game Initialization and Loop ---
    function initGame() {
        // console.log(`Init Game Mode: ${currentGameMode}, Difficulty: ${selectedDifficulty}`);
        startScreen.style.display = 'none'; gameOverScreen.style.display = 'none'; gameArea.style.display = 'block';
        timerDisplay.style.display = (currentGameMode === 'onePlayer') ? 'block' : 'none';
        scoreDisplayContainer.style.display = 'block';
        GAME_WIDTH = gameArea.offsetWidth; GAME_HEIGHT = gameArea.offsetHeight; if (GAME_WIDTH === 0 || GAME_HEIGHT === 0) { console.error("Game area dimensions zero!"); GAME_WIDTH = 600; GAME_HEIGHT = 500; }
        keysPressed = {}; pooScore = 0; toiletScore = 0; currentLevel = 0;
        if (currentGameMode === 'onePlayer') { toiletState.baseSpeed = difficultySpeeds[selectedDifficulty] || 4.3; } else { toiletState.baseSpeed = DEFAULT_TOILET_SPEED_2P; }
        toiletState.speed = toiletState.baseSpeed;
        resetPlayerState(pooState, initialPooPos.x, initialPooPos.y); resetPlayerState(toiletState, initialToiletPos.x, initialToiletPos.y);
        initializeWalls(); placeItems(); updateGameStatusDisplay(); setBackgroundForLevel(currentLevel);
        if (gameLoopInterval) { clearInterval(gameLoopInterval); gameLoopInterval = null; } if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
        startTime = Date.now(); elapsedTime = 0; updateTimerDisplay();
        if (checkWinCondition()) { console.error("Win condition met immediately!"); return; }
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
        // console.log("Game Over!");
        elapsedTime = ((Date.now() - startTime) / 1000);
        clearInterval(gameLoopInterval); gameLoopInterval = null; if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
        winSound.currentTime = 0; winSound.play().catch(e => console.error("Sound error:", e));
        let timeText = ''; let scoreText = '';
        if (currentGameMode === 'onePlayer') { timeText = `Survived for ${elapsedTime.toFixed(1)} seconds!`; scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`; }
        else { timeText = ''; scoreText = `Final Score - 💩: ${pooScore} | 🚽: ${toiletScore} (Level ${currentLevel})`; }
        // console.log("Attempting to show gameOverScreen. Element is:", gameOverScreen);
        if (finalTimeDisplay) { finalTimeDisplay.textContent = timeText; } else { console.error("ERROR: finalTimeDisplay is null!"); }
        if (finalScoreDisplay) { finalScoreDisplay.textContent = scoreText; } else { console.error("ERROR: finalScoreDisplay is null!"); }
        if (gameOverScreen) { gameOverScreen.style.display = 'flex'; } else { console.error("ERROR: gameOverScreen is null!"); }
        if (gameArea) { gameArea.style.display = 'none'; }
        // console.log("endGame function finished");
    }

    // --- Event Listeners ---
    startOnePlayerButton.addEventListener('click', () => { selectedDifficulty = parseInt(difficultySelect.value) || 4; currentGameMode = 'onePlayer'; initGame(); });
    startTwoPlayerButton.addEventListener('click', () => { currentGameMode = 'twoPlayer'; initGame(); });
    restartButton.addEventListener('click', () => { gameOverScreen.style.display = 'none'; startScreen.style.display = 'flex'; if (gameLoopInterval) clearInterval(gameLoopInterval); gameLoopInterval = null; if (gameTimerInterval) clearInterval(gameTimerInterval); gameTimerInterval = null; });
    document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

    // --- Initial Setup ---
    startScreen.style.display = 'flex'; gameArea.style.display = 'none'; gameOverScreen.style.display = 'none'; timerDisplay.style.display = 'none'; scoreDisplayContainer.style.display = 'none';

}); // End DOMContentLoaded
// --- END OF FILE script.js ---
