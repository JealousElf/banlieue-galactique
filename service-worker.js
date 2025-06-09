<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Banlieue Galactique</title>
<style>
  html, body {
    margin: 0; padding: 0; overflow: hidden;
    background: #000014;
    font-family: monospace;
    height: 100vh; width: 100vw;
  }
  #gameContainer {
    position: fixed;
    top: 20px; left: 20px; right: 20px; bottom: 20px;
    border: 3px solid #00ffcc;
    border-radius: 15px;
    box-shadow: 0 0 20px 5px #4caf50, inset 0 0 20px 2px #00ffff;
    background: #111133;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #gameCanvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  #info {
    position: fixed;
    top: 10px; left: 10px;
    color: white;
    z-index: 100;
    background: rgba(0,0,0,0.6);
    padding: 10px 15px;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.4;
    white-space: pre-line;
    max-width: 200px;
    font-family: monospace;
  }
  #reloadMessage {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 20px;
    color: white;
    background: rgba(0,0,0,0.7);
    padding: 10px 20px;
    border-radius: 8px;
    display: none;
    z-index: 3000;
  }
  #menus {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
    font-size: 20px;
    overflow-y: auto;
    padding: 10px;
  }
  button {
    margin: 10px;
    padding: 10px 20px;
    border-radius: 10px;
    border: none;
    background: #4caf50;
    color: white;
    cursor: pointer;
    user-select: none;
  }
  button:hover {
    background: #388e3c;
  }
  input {
    padding: 10px;
    font-size: 16px;
    border-radius: 8px;
    border: none;
    margin-bottom: 10px;
  }
  table {
    border-collapse: collapse;
    width: 90%;
    max-width: 600px;
    margin-top: 15px;
    color: white;
    font-family: monospace;
  }
  th, td {
    border: 1px solid white;
    padding: 5px 10px;
    text-align: left;
  }
  th {
    background-color: #4caf50;
  }
</style>
</head>
<body>
<div id="gameContainer">
  <canvas id="gameCanvas"></canvas>
</div>

<div id="info"></div>
<div id="menus"></div>
<div id="reloadMessage">Appuie sur R pour recharger !</div>

<script>
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const container = document.getElementById("gameContainer");

  let width, height;
  const backgroundCanvas = document.createElement('canvas');
  const bgCtx = backgroundCanvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    width = canvas.width;
    height = canvas.height;

    backgroundCanvas.width = width;
    backgroundCanvas.height = height;

    createBackground();
  }
  window.addEventListener('resize', resizeCanvas);

  const menus = document.getElementById('menus');
  const reloadMessage = document.getElementById('reloadMessage');
  const info = document.getElementById('info');

  let gameStarted = false, gameOver = false, pendingUpgrade = false, isPaused = false;
  let playerName = "MC Alex";
  let damageBonus = 0, wave = 1, score = 0;
  let mouseX, mouseY;
  let bulletSpeed = 10;

  const dashDistance = 120;
  let playerDashMax = 1;
  let playerCanDash = 1;
  let chatCanDash = true;

  let bulletsFired = 0;
  let noisetteDeathCount = 0;
  let doubleMagCount = 0;
  let dashUpgradeCount = 0;
  let speedUpgradeCount = 0;

  let difficultyMultiplier = 1;

  const player = { 
    x: 0, y: 0, angle: 0, size: 20, 
    maxAmmo: 25, ammo: 25, reloadTime: 1500, isReloading: false, 
    health: 3, bigBullets: false,
    speed: 3,
    piercingCount: 1,
    multiShotCount: 1
  };
  const chats = [];
  let enemies = [], bullets = [], croixNoisette = [];

  let hasReviveNoisetteBonus = false;
  let noisetteBaseHealth = 1;
  let noisetteSpeed = 2;
  let noisetteCanRespawn = false;

  const basePlayerSpeed = 3;
  const baseChatSpeed = 2;

  // Audio setup
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const globalVolume = 0.12;

  async function ensureAudioContextStarted() {
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  }

  // Background music with louder volume and continuous looping
  let ambianceGainNode = null;
  let ambianceOscillators = [];
  function startBackgroundMusic() {
    if (isPaused || gameOver || !gameStarted) return;

    // Clear previous oscillators if any
    ambianceOscillators.forEach(osc => osc.stop());
    ambianceOscillators = [];

    if (ambianceGainNode) {
      ambianceGainNode.disconnect();
    }

    ambianceGainNode = audioCtx.createGain();
    ambianceGainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // Augmenté (un peu moins fort que sons)
    ambianceGainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    // Notes répétées (C4, E4, G4, F4)
    const notes = [261.63, 329.63, 392.00, 349.23];
    const noteDuration = 0.5;
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * noteDuration);
      osc.connect(ambianceGainNode);
      osc.start(now + i * noteDuration);
      osc.stop(now + (i + 1) * noteDuration);
      ambianceOscillators.push(osc);
    });

    // Redémarrer la boucle après la dernière note
    setTimeout(() => {
      if (!gameOver && gameStarted && !isPaused) startBackgroundMusic();
    }, notes.length * noteDuration * 1000 + 50);
  }

  function playSound(freq, duration = 100, volume = 0.1, type = 'square') {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume * globalVolume, audioCtx.currentTime);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  }

  function playButtonClick() {
    playSound(1000, 60, 0.07, 'square');
  }

  function playNoisetteDeathShort() {
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.05 * globalVolume, now);

    const notes = [220, 196, 174];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.connect(gainNode);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.1);
    });
  }

  function playCling() {
    playSound(1200, 80, 0.07, 'triangle');
  }

  function playEnemyDeathSound(hpMax) {
    let freq = 600 - Math.min(hpMax, 100) * 3;
    freq = Math.max(300, freq);
    let vol = 0.1 - Math.min(hpMax, 100) * 0.0008;
    vol = Math.max(0.03, vol);
    playSound(freq, 100, vol, 'triangle');
  }

  function playStartMelody() {
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.05 * globalVolume, now);

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      osc.connect(gainNode);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    });
  }

  function playEndMelody() {
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.04 * globalVolume, now);

    const notes = [392, 349.23, 293.66, 261.63];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.6);
      osc.connect(gainNode);
      osc.start(now + i * 0.6);
      osc.stop(now + i * 0.6 + 0.5);
    });
  }

  function playLoseHeartSound() {
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.04 * globalVolume, now);

    const notes = [220, 196, 220];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.connect(gainNode);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.1);
    });
  }

  function playDashWind() {
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.02 * globalVolume, now);

    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.15);

    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  }

  // ===

  let animationFrameId = null;

  function loop() {
    animationFrameId = requestAnimationFrame(loop);
    if (isPaused) return;
    update();
    updateChats();
    draw();
  }

  function startLoop() {
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function updateSpeedAfterUpgrade() {
    const speedFactor = 1.5;
    player.speed = basePlayerSpeed + Math.log(speedUpgradeCount + 1) * speedFactor;
    chats.forEach(chat => {
      chat.speed = baseChatSpeed + Math.log(speedUpgradeCount + 1) * speedFactor;
    });
  }

  function initGamePositions() {
    player.x = width / 2;
    player.y = height / 2;
    mouseX = width / 2;
    mouseY = height / 2;
    chats.length = 0;
    noisetteBaseHealth = 1;
    noisetteSpeed = 2;
    noisetteCanRespawn = false;
    player.maxAmmo = 25;
    player.ammo = player.maxAmmo;
    player.piercingCount = 1;
    player.multiShotCount = 1;

    speedUpgradeCount = 0;
    player.speed = basePlayerSpeed;

    bulletsFired = 0;
    noisetteDeathCount = 0;
    doubleMagCount = 0;
    dashUpgradeCount = 0;

    difficultyMultiplier = 1;

    chats.push({ x: player.x - 50, y: player.y - 50, size: 15, speed: baseChatSpeed, health: noisetteBaseHealth, maxHealth: noisetteBaseHealth });
  }

  const keys = {};
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'r' && !player.isReloading && player.ammo < player.maxAmmo) reload();
    if (key === 'escape' && gameStarted && !gameOver && !pendingUpgrade) togglePause();
    if (key === ' ' || key === 'space') tryDash();
  });
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  window.addEventListener('mousedown', () => { if (!isPaused) shoot(); });
  window.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  function createBackground() {
    bgCtx.fillStyle = '#88cc55';
    bgCtx.fillRect(0, 0, width, height);
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      bgCtx.fillStyle = `rgba(34, 85, 12, ${Math.random() * 0.5 + 0.3})`;
      bgCtx.beginPath();
      bgCtx.ellipse(x, y, size * 0.5, size, 0, 0, Math.PI * 2);
      bgCtx.fill();
    }
    const flowerColors = ['#ff6699', '#ffcc33', '#ff9966', '#ff66cc', '#cc3366'];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const petalSize = 5;
      const centerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 2) {
        bgCtx.fillStyle = 'white';
        bgCtx.beginPath();
        bgCtx.ellipse(
          x + Math.cos(angle) * petalSize,
          y + Math.sin(angle) * petalSize,
          petalSize * 0.6,
          petalSize * 0.9,
          angle,
          0,
          Math.PI * 2
        );
        bgCtx.fill();
      }
      bgCtx.fillStyle = centerColor;
      bgCtx.beginPath();
      bgCtx.arc(x, y, petalSize * 0.8, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  function drawBackground() {
    ctx.drawImage(backgroundCanvas, 0, 0);
  }

  function tryDash() {
    if (!gameStarted || gameOver || pendingUpgrade || isPaused) return;
    if (playerCanDash <= 0) return;
    let dirX = 0, dirY = 0;
    if (keys['z']) dirY -= 1;
    if (keys['s']) dirY += 1;
    if (keys['q']) dirX -= 1;
    if (keys['d']) dirX += 1;
    const dist = Math.hypot(dirX, dirY);
    if (dist === 0) return;
    const normX = dirX / dist;
    const normY = dirY / dist;
    player.x += normX * dashDistance;
    player.y += normY * dashDistance;
    clampPlayerPosition();
    playerCanDash--;
    playDashWind();
    if (chatCanDash && chats.length > 0) {
      const chat = chats[0];
      chat.x += normX * dashDistance * 0.8;
      chat.y += normY * dashDistance * 0.8;
      clampChatPosition(chat);
      chatCanDash = false;
    }
  }

  function clampPlayerPosition() {
    player.x = Math.max(player.size, Math.min(width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(height - player.size, player.y));
  }

  function clampChatPosition(chat) {
    chat.x = Math.max(chat.size, Math.min(width - chat.size, chat.x));
    chat.y = Math.max(chat.size, Math.min(height - chat.size, chat.y));
  }

  function drawDashIcon() {
    const wingWidth = 14;
    const wingHeight = 20;
    const startX = player.x - ((wingWidth + 6) * playerDashMax - 6) / 2;
    const startY = player.y + player.size + 18;
    ctx.lineWidth = 2;
    for (let i = 0; i < playerDashMax; i++) {
      const x = startX + i * (wingWidth + 6);
      const isAvailable = i < playerCanDash;
      ctx.strokeStyle = isAvailable ? '#00ffff' : 'gray';
      ctx.fillStyle = isAvailable ? 'rgba(0, 255, 255, 0.3)' : 'rgba(128,128,128,0.2)';
      ctx.beginPath();
      ctx.moveTo(x + wingWidth / 2, startY);
      ctx.bezierCurveTo(x + wingWidth * 0.8, startY - wingHeight * 0.2, x + wingWidth * 0.6, startY - wingHeight * 0.8, x + wingWidth / 2, startY - wingHeight);
      ctx.bezierCurveTo(x + wingWidth * 0.4, startY - wingHeight * 0.8, x + wingWidth * 0.2, startY - wingHeight * 0.2, x + wingWidth / 2, startY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + wingWidth / 2, startY - wingHeight);
      ctx.lineTo(x + wingWidth / 2, startY);
      ctx.moveTo(x + wingWidth / 2, startY - wingHeight * 0.75);
      ctx.lineTo(x + wingWidth * 0.7, startY - wingHeight * 0.55);
      ctx.lineTo(x + wingWidth / 2, startY - wingHeight * 0.6);
      ctx.lineTo(x + wingWidth * 0.6, startY - wingHeight * 0.3);
      ctx.moveTo(x + wingWidth / 2, startY - wingHeight * 0.45);
      ctx.lineTo(x + wingWidth * 0.5, startY - wingHeight * 0.1);
      ctx.stroke();
    }
  }

  function togglePause() {
    playButtonClick();
    if (!isPaused) {
      isPaused = true;
      stopLoop();
      showMenu('<div>Jeu en pause</div><button id="resumeBtn">Reprendre</button>');
      info.style.display = 'none';
      setTimeout(() => {
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
          resumeBtn.onclick = () => {
            playButtonClick();
            togglePause();
          };
        }
      }, 0);
    } else {
      isPaused = false;
      menus.style.display = 'none';
      info.style.display = 'block';
      startLoop();
    }
  }

  function bordure() {
    clampPlayerPosition();
  }

  function showMenu(content) {
    menus.innerHTML = '';
    menus.style.display = 'flex';
    if (typeof content === 'string') menus.innerHTML = content;
    else menus.appendChild(content);

    // Ajout automatique son clic sur tous les boutons (dynamiques inclus)
    const buttons = menus.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.onclick = (e) => {
        playButtonClick();
        if (btn.dataset.upgradeId) {
          chooseUpgrade(btn.dataset.upgradeId);
          e.stopPropagation();
        }
      };
    });
  }

  async function startGame() {
    await ensureAudioContextStarted();
    playStartMelody();
    startBackgroundMusic();
    gameStarted = true;
    gameOver = false;
    pendingUpgrade = false;
    isPaused = false;
    damageBonus = 0;
    wave = 1;
    score = 0;
    difficultyMultiplier = 1;
    player.health = 3;
    player.maxAmmo = 25;
    player.ammo = player.maxAmmo;
    player.bigBullets = false;
    player.piercingCount = 1;
    player.multiShotCount = 1;
    bulletSpeed = 10;
    hasReviveNoisetteBonus = false;
    noisetteBaseHealth = 1;
    noisetteSpeed = 2;
    noisetteCanRespawn = false;
    playerDashMax = 1;
    playerCanDash = playerDashMax;
    speedUpgradeCount = 0;
    player.speed = basePlayerSpeed;
    bulletsFired = 0;
    noisetteDeathCount = 0;
    doubleMagCount = 0;
    dashUpgradeCount = 0;
    info.style.display = 'block';
    menus.style.display = 'none';
    initGamePositions();
    spawnEnemies();
    startLoop();
  }

  function reload() {
    if (player.isReloading || player.ammo >= player.maxAmmo) return;
    player.isReloading = true;
    player.reloadStartTime = Date.now();
    setTimeout(() => {
      player.ammo = player.maxAmmo;
      player.isReloading = false;
    }, player.reloadTime);
  }

  function shoot() {
    if (!gameStarted || player.isReloading || gameOver || pendingUpgrade || isPaused) return;
    if (player.ammo <= 0) {
      reloadMessage.style.display = 'block';
      setTimeout(() => reloadMessage.style.display = 'none', 1500);
      return;
    }
    player.ammo--;
    bulletsFired++;

    const baseAngle = player.angle;
    const count = player.multiShotCount;
    const spread = 0.15;
    if(count === 1) {
      bullets.push({ x: player.x, y: player.y, angle: baseAngle, size: player.bigBullets ? 10 : 5, piercedEnemies: 0 });
    } else {
      for(let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1));
        const angleOffset = (t - 0.5) * 2 * spread;
        bullets.push({ x: player.x, y: player.y, angle: baseAngle + angleOffset, size: player.bigBullets ? 10 : 5, piercedEnemies: 0 });
      }
    }
  }

  function spawnEnemies() {
    enemies = [];
    const isBossWave = wave % 5 === 0;
    const safeDistance = 400;

    if (isBossWave) {
      difficultyMultiplier *= 1.3;
    }

    function getRandomSafePos() {
      let x, y, dist;
      do {
        x = Math.random() * width;
        y = Math.random() * height;
        dist = Math.hypot(player.x - x, player.y - y);
      } while (dist < safeDistance);
      return {x, y};
    }

    function randomSpeed(base) {
      return base * (0.9 + Math.random() * 0.2) * difficultyMultiplier;
    }

    if (isBossWave) {
      const pos = getRandomSafePos();
      let baseSpeed = (2 + wave * 0.05) * difficultyMultiplier;
      let angle = Math.random() * Math.PI * 2;
      enemies.push({ 
        x: pos.x, y: pos.y, size: 60, speed: baseSpeed, 
        alive: true, hp: Math.floor((50 + wave * 5) * difficultyMultiplier), 
        isBoss: true, name: "Oiseau",
        velocityX: Math.cos(angle) * randomSpeed(baseSpeed),
        velocityY: Math.sin(angle) * randomSpeed(baseSpeed),
        mode: "encercler",
        modeStartTime: Date.now()
      });
    }

    const libelluleCount = Math.floor(3 + wave * 1.2 * difficultyMultiplier);
    for (let i = 0; i < libelluleCount; i++) {
      const pos = getRandomSafePos();
      let baseSpeed = (1.8 + Math.log(wave + 1) * 0.6) * difficultyMultiplier;
      let angle = Math.random() * Math.PI * 2;
      enemies.push({ 
        x: pos.x, y: pos.y, size: 18 + wave * 0.3, speed: baseSpeed,
        alive: true, hp: Math.floor((3 + wave * 1.5) * difficultyMultiplier), 
        isBoss: false, name: "Libellule",
        velocityX: Math.cos(angle) * randomSpeed(baseSpeed),
        velocityY: Math.sin(angle) * randomSpeed(baseSpeed),
        mode: "encercler",
        modeStartTime: Date.now()
      });
    }

    const sourisCount = Math.floor(1 + wave * 0.7 * difficultyMultiplier);
    for (let i = 0; i < sourisCount; i++) {
      const pos = getRandomSafePos();
      let baseSpeed = (1.2 + (wave * 0.2)) * difficultyMultiplier;
      let angle = Math.random() * Math.PI * 2;
      enemies.push({ 
        x: pos.x, y: pos.y, size: 30 + Math.log(wave + 1) * 1.5, speed: baseSpeed,
        alive: true, hp: Math.floor((5 + wave * 2) * difficultyMultiplier), 
        isBoss: false, name: "Souris Z-" + wave,
        velocityX: Math.cos(angle) * randomSpeed(baseSpeed),
        velocityY: Math.sin(angle) * randomSpeed(baseSpeed),
        mode: "encercler",
        modeStartTime: Date.now()
      });
    }
  }

  function showStats() {
    playEndMelody();

    const totalBulletsFired = bulletsFired;
    const noisetteTotalHP = chats.reduce((sum, c) => sum + c.health, 0);

    const statsData = [
      ['Vague atteinte', wave, 'Score (ennemis tués)', score],
      ['Munitions max', player.maxAmmo, 'Munitions restantes', player.ammo],
      ['Total balles tirées', totalBulletsFired, 'Dégâts bonus', damageBonus],
      ['Points de vitesse pris', speedUpgradeCount, 'Vitesse joueur finale', player.speed.toFixed(2)],
      ['Vitesse balles finale', bulletSpeed, 'Temps recharge final (ms)', player.reloadTime],
      ['Vie joueur finale', player.health, 'Vie totale Noisette', noisetteTotalHP],
      ['Morts de Noisette', noisetteDeathCount, 'Balles perforantes', player.piercingCount],
      ['Nombre balles par tir (multiShot)', player.multiShotCount, 'Améliorations double chargeur', doubleMagCount],
      ['Améliorations dash', dashUpgradeCount, '', '']
    ];

    let rowsHTML = '';
    statsData.forEach(row => {
      rowsHTML += `<tr>
        <td style="border: 1px solid white; padding: 5px;">${row[0]}</td>
        <td style="border: 1px solid white; padding: 5px;">${row[1]}</td>
        <td style="border: 1px solid white; padding: 5px;">${row[2]}</td>
        <td style="border: 1px solid white; padding: 5px;">${row[3]}</td>
      </tr>`;
    });

    const statsHTML = `
    <div>Tu es mort à la vague ${wave} avec un score de ${score}</div>
    <table>
      <thead>
        <tr>
          <th>Statistique</th><th>Valeur</th><th>Statistique</th><th>Valeur</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
    <button id="replayBtn">Rejouer</button>
    <button id="shareBtn">Partager mon score</button>
    `;
    showMenu(statsHTML);

    setTimeout(() => {
      const replayBtn = document.getElementById('replayBtn');
      if (replayBtn) {
        replayBtn.onclick = () => {
          playButtonClick();
          location.reload();
        };
      }
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) {
        shareBtn.onclick = () => {
          playButtonClick();
          shareScore();
        };
      }
    }, 0);
  }

  function shareScore() {
    const totalBulletsFired = bulletsFired;
    const noisetteTotalHP = chats.reduce((sum, c) => sum + c.health, 0);

    const statsData = [
      ['Vague atteinte', wave, 'Score (ennemis tués)', score],
      ['Munitions max', player.maxAmmo, 'Munitions restantes', player.ammo],
      ['Total balles tirées', totalBulletsFired, 'Dégâts bonus', damageBonus],
      ['Points de vitesse pris', speedUpgradeCount, 'Vitesse joueur finale', player.speed.toFixed(2)],
      ['Vitesse balles finale', bulletSpeed, 'Temps recharge final (ms)', player.reloadTime],
      ['Vie joueur finale', player.health, 'Vie totale Noisette', noisetteTotalHP],
      ['Morts de Noisette', noisetteDeathCount, 'Balles perforantes', player.piercingCount],
      ['Nombre balles par tir (multiShot)', player.multiShotCount, 'Améliorations double chargeur', doubleMagCount],
      ['Améliorations dash', dashUpgradeCount, '', '']
    ];

    let textStats = `Banlieue Galactique - Score de ${playerName}\n`;
    textStats += `Tu es mort à la vague ${wave} avec un score de ${score}\n\n`;
    textStats += `Statistiques détaillées :\n`;

    statsData.forEach(row => {
      textStats += `${row[0]} : ${row[1]}    |    ${row[2]} : ${row[3]}\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textStats).then(() => {
        alert("Score et stats copiés dans le presse-papier !");
      }, () => {
        alert("Impossible de copier automatiquement. Voici le texte :\n" + textStats);
      });
    } else {
      prompt("Copiez ce texte pour partager :", textStats);
    }
  }

  function update() {
    if (!gameStarted || gameOver || pendingUpgrade) return;
    if (keys['z']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['q']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    bordure();

    const dx = mouseX - player.x, dy = mouseY - player.y;
    player.angle = Math.atan2(dy, dx);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * bulletSpeed;
      b.y += Math.sin(b.angle) * bulletSpeed;

      let hitEnemyThisFrame = false;
      for (const e of enemies) {
        if (e.alive && Math.hypot(b.x - e.x, b.y - e.y) < e.size + b.size) {
          e.hp -= 1 + damageBonus;
          if (e.hp <= 0) {
            e.alive = false;
            playCling();
            playEnemyDeathSound(e.hp + damageBonus + 1);
            if (e.isBoss) {
              const reward = Math.random() < 0.5 ? 'multiShot' : 'bigBullets';
              if (reward === 'multiShot') player.multiShotCount++;
              else if (reward === 'bigBullets') {
                player.bigBullets = true;
                if (doubleMagCount === 0) doubleMagCount++;
                player.piercingCount = Math.max(player.piercingCount, 2);
                player.piercingCount++;
              }
            }
            score++;
          }
          hitEnemyThisFrame = true;
          b.piercedEnemies++;
          if (b.piercedEnemies >= player.piercingCount) break;
        }
      }
      if (hitEnemyThisFrame && b.piercedEnemies >= player.piercingCount) {
        bullets.splice(i, 1);
      } else if (b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
        bullets.splice(i, 1);
      }
    }

    enemies.forEach((e, idx) => {
      if (!e.alive) return;

      // Ajouter un bruit léger aléatoire sur la trajectoire
      if (!e.noiseOffset) e.noiseOffset = Math.random() * 1000;
      e.noiseOffset += 0.05;
      const noiseAmplitude = 0.5;
      const angleNoise = Math.sin(e.noiseOffset) * noiseAmplitude;

      // Comportement selon mode "encercler" ou "attaquer"
      if (!e.mode) e.mode = "encercler";
      if (!e.modeStartTime) e.modeStartTime = Date.now();

      const modeDuration = 3000; // ms à encercler avant d'attaquer

      let targetX, targetY;
      if (e.mode === "encercler") {
        // Position en cercle autour du joueur
        const circleRadius = 120 + e.size;
        const angleAroundPlayer = (idx / enemies.length) * (Math.PI * 2);

        targetX = player.x + Math.cos(angleAroundPlayer) * circleRadius;
        targetY = player.y + Math.sin(angleAroundPlayer) * circleRadius;

        // Après 3 secondes, passer en mode attaque
        if (Date.now() - e.modeStartTime > modeDuration) {
          e.mode = "attaquer";
        }
      } else if (e.mode === "attaquer") {
        // Direct vers le joueur
        targetX = player.x;
        targetY = player.y;
      }

      let angleToTarget = Math.atan2(targetY - e.y, targetX - e.x);
      angleToTarget += angleNoise;

      const baseSpeed = e.speed;
      const randomSpeedFactor = 0.85 + Math.random() * 0.3;
      const finalSpeed = baseSpeed * randomSpeedFactor;

      const desiredVX = Math.cos(angleToTarget) * finalSpeed;
      const desiredVY = Math.sin(angleToTarget) * finalSpeed;

      const steerFactor = 0.05;
      if (!e.velocityX) e.velocityX = 0;
      if (!e.velocityY) e.velocityY = 0;

      e.velocityX += (desiredVX - e.velocityX) * steerFactor;
      e.velocityY += (desiredVY - e.velocityY) * steerFactor;

      e.x += e.velocityX;
      e.y += e.velocityY;

      if (Math.hypot(player.x - e.x, player.y - e.y) < e.size + player.size) {
        e.alive = false;
        player.health--;
        playLoseHeartSound();
        if (player.health <= 0) {
          gameOver = true;
          showStats();
        }
      }
    });

    if (enemies.every(e => !e.alive)) {
      wave++;
      difficultyMultiplier = 1 + 0.2 * Math.floor(wave / 5);

      pendingUpgrade = true;
      info.style.display = 'none';

      playerCanDash = playerDashMax;
      chatCanDash = true;

      showUpgradeMenu();
    }
  }

  function updateChats() {
    for (let i = chats.length - 1; i >= 0; i--) {
      const chat = chats[i];
      const dx = player.x - chat.x;
      const dy = player.y - chat.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 20) {
        chat.x += (dx / dist) * chat.speed;
        chat.y += (dy / dist) * chat.speed;
      }
      for (const e of enemies) {
        if (e.alive && Math.hypot(chat.x - e.x, chat.y - e.y) < chat.size + e.size) {
          e.alive = false;
          croixNoisette.push({ x: chat.x, y: chat.y });
          chats.splice(i, 1);
          noisetteDeathCount++;
          playNoisetteDeathShort();

          if (hasReviveNoisetteBonus && noisetteCanRespawn) {
            noisetteSpeed *= 2;
            noisetteBaseHealth *= 2;
            chats.push({ 
              x: player.x - 50, 
              y: player.y - 50, 
              size: 15, 
              speed: noisetteSpeed,  
              health: noisetteBaseHealth, 
              maxHealth: noisetteBaseHealth 
            });
            noisetteCanRespawn = false;
          }

          score++;
          break;
        }
      }
    }
  }

  function draw() {
    drawBackground();

    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(player.angle) * player.size, player.y + Math.sin(player.angle) * player.size);
    ctx.lineTo(player.x + Math.cos(player.angle + 2.5) * player.size * 0.7, player.y + Math.sin(player.angle + 2.5) * player.size * 0.7);
    ctx.lineTo(player.x + Math.cos(player.angle - 2.5) * player.size * 0.7, player.y + Math.sin(player.angle - 2.5) * player.size * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(playerName, player.x, player.y - player.size - 30);
    ctx.fillText(player.health + "❤", player.x, player.y - player.size - 15);

    drawDashIcon();

    if (player.isReloading) {
      const elapsed = Date.now() - player.reloadStartTime;
      const percent = Math.min(elapsed / player.reloadTime, 1);
      ctx.fillStyle = 'black';
      ctx.fillRect(player.x - 20, player.y + player.size + 10, 40, 6);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(player.x - 20, player.y + player.size + 10, 40 * percent, 6);
    }

    bullets.forEach(b => {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    });

    chats.forEach(chat => {
      ctx.fillStyle = '#ffaa33';
      ctx.beginPath();
      ctx.ellipse(chat.x, chat.y, chat.size * 1.2, chat.size, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffaa33';
      ctx.beginPath();
      ctx.arc(chat.x, chat.y - chat.size * 1.2, chat.size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff9933';
      ctx.beginPath();
      ctx.moveTo(chat.x - chat.size * 0.5, chat.y - chat.size * 1.7);
      ctx.lineTo(chat.x - chat.size * 0.2, chat.y - chat.size * 1.5);
      ctx.lineTo(chat.x - chat.size * 0.4, chat.y - chat.size * 1.3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(chat.x + chat.size * 0.5, chat.y - chat.size * 1.7);
      ctx.lineTo(chat.x + chat.size * 0.2, chat.y - chat.size * 1.5);
      ctx.lineTo(chat.x + chat.size * 0.4, chat.y - chat.size * 1.3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.ellipse(chat.x - chat.size * 0.25, chat.y - chat.size * 1.2, chat.size * 0.15, chat.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(chat.x + chat.size * 0.25, chat.y - chat.size * 1.2, chat.size * 0.15, chat.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(chat.x, chat.y - chat.size * 1.0);
      ctx.lineTo(chat.x - chat.size * 0.15, chat.y - chat.size * 0.85);
      ctx.lineTo(chat.x + chat.size * 0.15, chat.y - chat.size * 0.85);
      ctx.closePath();
      ctx.fillStyle = '#cc6600';
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText("Noisette", chat.x, chat.y - chat.size - 10);

      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.fillText(chat.health + "❤", chat.x, chat.y - chat.size - 25);
    });

    enemies.forEach(e => {
      if (!e.alive) return;

      if (e.isBoss) {
        const size = e.size;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.speed * 0.1);

        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.7, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cc00cc';
        ctx.beginPath();
        ctx.arc(0, -size * 1.0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff88ff';
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.3);
        ctx.lineTo(size * 0.3, -size * 0.9);
        ctx.lineTo(-size * 0.3, -size * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#dd00dd';
        ctx.beginPath();
        ctx.ellipse(-size * 0.8, 0, size * 0.3, size * 0.8, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(size * 0.8, 0, size * 0.3, size * 0.8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);

      } else {
        if (e.name.startsWith("Libellule")) {
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.size * 0.5, e.size * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          const wingLength = e.size * 1.8;
          const wingWidth = e.size * 0.5;

          ctx.beginPath();
          ctx.ellipse(e.x - wingWidth, e.y - wingLength * 0.5, wingWidth, wingLength, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(e.x + wingWidth, e.y - wingLength * 0.5, wingWidth, wingLength, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(e.x - wingWidth, e.y + wingLength * 0.5, wingWidth, wingLength, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(e.x + wingWidth, e.y + wingLength * 0.5, wingWidth, wingLength, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#b22222';
          ctx.beginPath();
          ctx.arc(e.x, e.y - e.size * 1.2, e.size * 0.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(e.x - e.size * 0.2, e.y - e.size * 1.3, e.size * 0.1, 0, Math.PI * 2);
          ctx.arc(e.x + e.size * 0.2, e.y - e.size * 1.3, e.size * 0.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'white';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);

        } else if (e.name.startsWith("Souris")) {
          ctx.fillStyle = '#a0522d';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.size * 1.2, e.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#8b4513';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.0, e.y - e.size * 0.2, e.size * 0.7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#deb887';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.4, e.y - e.size * 0.8, e.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e.x + e.size * 0.7, e.y - e.size * 0.9, e.size * 0.25, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.0, e.y - e.size * 0.3, e.size * 0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#8b4513';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(e.x - e.size * 1.2, e.y + e.size * 0.5);
          ctx.quadraticCurveTo(e.x - e.size * 1.8, e.y + e.size * 1.5, e.x - e.size * 1.0, e.y + e.size * 2.0);
          ctx.stroke();

          ctx.fillStyle = 'white';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);
        }
      }
    });

    croixNoisette.forEach(c => {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;

      const crossHeight = 50;
      const crossWidth = 20;
      const crossBarHeight = 15;
      const barWidth = 30;

      ctx.beginPath();
      ctx.moveTo(c.x, c.y - crossHeight / 2);
      ctx.lineTo(c.x, c.y + crossHeight / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(c.x - barWidth / 2, c.y - crossHeight / 2 + crossBarHeight);
      ctx.lineTo(c.x + barWidth / 2, c.y - crossHeight / 2 + crossBarHeight);
      ctx.stroke();
    });

    updateInfo();
  }

  function updateInfo() {
    const noisetteTotalHP = chats.reduce((sum, c) => sum + c.health, 0);
    info.textContent =
`Vague : ${wave}
Munitions : ${player.ammo} / ${player.maxAmmo}
Dégâts bonus : ${damageBonus}
Points de vitesse : ${speedUpgradeCount}
Vitesse joueur : ${player.speed.toFixed(2)}
Vitesse balles : ${bulletSpeed}
Temps recharge : ${player.reloadTime} ms
Vie totale Noisette : ${noisetteTotalHP}
Balles perforantes : ${player.piercingCount}
Nombre de balles tirées : ${player.multiShotCount}`;
  }

  function showUpgradeMenu() {
    const menu = document.createElement('div');
    menu.innerHTML = '<div>Choisis ton bonus :</div>';
    const upgrades = [
      { id: 'damage', label: '+ Dégâts' },
      { id: 'firerate', label: '+ Vitesse des balles' },
      { id: 'speed', label: '+ Vitesse de déplacement' },
      { id: 'heart', label: '+2 vies' },
      { id: 'reloadBoost', label: 'Recharge plus rapide' },
      { id: 'reviveNoisette', label: 'Faire revivre Noisette (+vie)' },
      { id: 'dashIncrease', label: '+1 dash à chaque vague' },
      { id: 'doubleMagazine', label: 'Double taille du chargeur' }
    ];

    const hasNoisetteAlive = chats.length > 0;
    let filteredUpgrades = upgrades;
    if (hasNoisetteAlive) {
      filteredUpgrades = upgrades.filter(u => u.id !== 'reviveNoisette');
    }

    const selected = filteredUpgrades.sort(() => 0.5 - Math.random()).slice(0, 2);
    selected.forEach(upg => {
      const btn = document.createElement('button');
      btn.textContent = upg.label;
      btn.dataset.upgradeId = upg.id;
      btn.onclick = () => {
        playButtonClick();
        chooseUpgrade(upg.id);
      };
      menu.appendChild(btn);
    });
    showMenu(menu);
  }

  function chooseUpgrade(type) {
    if(type === 'damage') damageBonus++;
    else if(type === 'firerate') bulletSpeed += 3;
    else if(type === 'speed') {
      speedUpgradeCount++;
      updateSpeedAfterUpgrade();
    }
    else if(type === 'heart') { 
      player.health += 2; 
    }
    else if(type === 'reloadBoost') {
      player.reloadTime = Math.max(200, player.reloadTime * 0.7);
    }
    else if(type === 'reviveNoisette') {
      hasReviveNoisetteBonus = true;
      noisetteCanRespawn = true;
      if (chats.length === 0) {
        chats.push({ x: player.x - 50, y: player.y - 50, size: 15, speed: noisetteSpeed, health: noisetteBaseHealth, maxHealth: noisetteBaseHealth });
      }
    }
    else if(type === 'dashIncrease') {
      playerDashMax++;
      playerCanDash = playerDashMax;
      dashUpgradeCount++;
    }
    else if(type === 'doubleMagazine') {
      player.maxAmmo *= 2;
      player.ammo = player.maxAmmo;
      doubleMagCount++;
    }
    menus.style.display = 'none';
    info.style.display = 'block';
    pendingUpgrade = false;
    spawnEnemies();
  }

  resizeCanvas();

  showMenu(`
    <div>Entrez votre nom de guerrier galactique :</div>
    <input type="text" id="playerNameInput" placeholder="MC Alex" />
    <button id="startBtn">Démarrer</button>
  `);

  document.getElementById('startBtn').onclick = async () => {
    playButtonClick();
    await ensureAudioContextStarted();
    const inputName = document.getElementById('playerNameInput');
    playerName = inputName.value.trim() || 'MC Alex';
    startGame();
  };

</script>
</body>
</html>
