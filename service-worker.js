<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Banlieue Galactique</title>
  <style>
    html, body {
      margin: 0; padding: 0; overflow: hidden;
      background: #000014; font-family: monospace;
      height: 100vh; width: 100vw;
      touch-action: none;
      -webkit-user-select: none; /* Disable selection on iOS */
      -ms-user-select: none;
      user-select: none;
    }
    #gameContainer {
      position: fixed; top: 20px; left: 20px; right: 20px; bottom: 20px;
      border: 3px solid #00ffcc;
      border-radius: 15px;
      box-shadow: 0 0 20px 5px #4caf50, inset 0 0 20px 2px #00ffff;
      background: #111133;
      display: flex; justify-content: center; align-items: center;
      touch-action: none;
    }
    #gameCanvas {
      display: block;
      width: 100%; height: 100%;
    }
    #info, #reloadMessage {
      position: fixed;
      color: white;
      z-index: 100;
      background: rgba(0,0,0,0.5);
      padding: 10px;
      border-radius: 8px;
      user-select: none;
    }
    #info {
      top: 10px; left: 10px;
      font-size: 18px;
    }
    #reloadMessage {
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      display: none;
      z-index: 3000;
    }
    #menus {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: white;
      font-size: 20px;
      user-select: none;
    }
    button {
      margin: 10px; padding: 10px 20px;
      border-radius: 10px; border: none;
      background: #4caf50; color: white;
      cursor: pointer;
      font-size: 18px;
    }
    button:hover {
      background: #388e3c;
    }
    input {
      padding: 10px; font-size: 16px;
      border-radius: 8px; border: none;
      margin-bottom: 10px;
    }
    /* Touch controls styling */
    #touchControls {
      position: fixed;
      bottom: 20px; left: 20px;
      width: 150px; height: 150px;
      border-radius: 50%;
      background: rgba(0,0,0,0.3);
      touch-action: none;
      z-index: 2000;
      user-select: none;
    }
    #joystickThumb {
      position: absolute;
      top: 50%; left: 50%;
      width: 60px; height: 60px;
      margin-left: -30px; margin-top: -30px;
      background: #4caf50;
      border-radius: 50%;
    }
    #shootButton, #reloadButton {
      position: fixed;
      width: 80px; height: 80px;
      border-radius: 50%;
      opacity: 0.8;
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      user-select: none;
      touch-action: manipulation;
      font-weight: bold;
      font-size: 28px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    #shootButton {
      bottom: 40px; right: 80px;
      background: #f44336;
      font-size: 32px;
    }
    #reloadButton {
      bottom: 140px; right: 80px;
      background: #2196f3;
      font-size: 26px;
    }
  </style>
</head>
<body>
  <div id="gameContainer">
    <canvas id="gameCanvas"></canvas>
  </div>

  <div id="info">Munitions: <span id="ammoCount">25</span> | Vie: <span id="healthCount">3</span> | Vague: <span id="waveCount">1</span> | Score: <span id="scoreCount">0</span></div>
  <div id="menus"></div>
  <div id="reloadMessage">Appuie sur R pour recharger !</div>

  <!-- Touch Controls -->
  <div id="touchControls">
    <div id="joystickThumb"></div>
  </div>
  <div id="shootButton">🔫</div>
  <div id="reloadButton">R</div>

<script>
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const container = document.getElementById("gameContainer");

  // Ajuste la taille du canvas à celle du container
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    width = canvas.width;
    height = canvas.height;
    createBackground();
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    setupJoystickCenter();
  });

  let width = canvas.width;
  let height = canvas.height;

  const menus = document.getElementById('menus');
  const reloadMessage = document.getElementById('reloadMessage');
  const info = document.getElementById('info');
  const ammoDisplay = document.getElementById('ammoCount');
  const healthDisplay = document.getElementById('healthCount');
  const waveDisplay = document.getElementById('waveCount');
  const scoreDisplay = document.getElementById('scoreCount');

  let gameStarted = false, gameOver = false, pendingUpgrade = false, isPaused = false;
  let playerName = "MC Alex";
  let damageBonus = 0, wave = 1, score = 0;
  let mouseX = width/2, mouseY = height/2;
  let bulletSpeed = 10;

  const player = { x: width/2, y: height/2, angle: 0, speed: 3, size: 20, ammo: 25, reloadTime: 1500, isReloading: false, health: 3, multiShot: false, bigBullets: false };
  const chats = [{ x: player.x - 50, y: player.y - 50, size: 15, speed: 2 }];
  let enemies = [], bullets = [], croixNoisette = [];

  const keys = {};

  // ----- Touch Controls variables -----
  const touchControls = document.getElementById('touchControls');
  const joystickThumb = document.getElementById('joystickThumb');
  const shootButton = document.getElementById('shootButton');
  const reloadButton = document.getElementById('reloadButton');

  let joystickActive = false;
  let joystickCenter = { x: 0, y: 0 };
  let moveVector = { x: 0, y: 0 };
  let isShooting = false;

  // Setup joystick center on load and resize
  function setupJoystickCenter() {
    const rect = touchControls.getBoundingClientRect();
    joystickCenter.x = rect.left + rect.width / 2;
    joystickCenter.y = rect.top + rect.height / 2;
  }
  setupJoystickCenter();

  // Touch joystick events
  touchControls.addEventListener('touchstart', e => {
    e.preventDefault();
    joystickActive = true;
    moveJoystick(e.touches[0]);
  });

  touchControls.addEventListener('touchmove', e => {
    if (!joystickActive) return;
    e.preventDefault();
    moveJoystick(e.touches[0]);
  });

  touchControls.addEventListener('touchend', e => {
    e.preventDefault();
    joystickActive = false;
    moveVector.x = 0;
    moveVector.y = 0;
    joystickThumb.style.transform = 'translate(0px, 0px)';
  });

  function moveJoystick(touch) {
    const maxDistance = 50;
    const deltaX = touch.clientX - joystickCenter.x;
    const deltaY = touch.clientY - joystickCenter.y;

    let distance = Math.hypot(deltaX, deltaY);
    if (distance > maxDistance) {
      distance = maxDistance;
    }
    const angle = Math.atan2(deltaY, deltaX);

    const posX = Math.cos(angle) * distance;
    const posY = Math.sin(angle) * distance;

    joystickThumb.style.transform = `translate(${posX}px, ${posY}px)`;

    moveVector.x = posX / maxDistance;
    moveVector.y = posY / maxDistance;
  }

  // Touch buttons events
  shootButton.addEventListener('touchstart', e => {
    e.preventDefault();
    isShooting = true;
  });
  shootButton.addEventListener('touchend', e => {
    e.preventDefault();
    isShooting = false;
  });

  reloadButton.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!player.isReloading && player.ammo < 25) reload();
  });

  // ----- Keyboard and mouse controls for desktop -----
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'r' && !player.isReloading && player.ammo < 25) reload();
    if (key === 'escape' && gameStarted && !gameOver && !pendingUpgrade) togglePause();
  });
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  window.addEventListener('mousedown', shoot);
  window.addEventListener('mousemove', e => { 
    mouseX = e.clientX - container.getBoundingClientRect().left; 
    mouseY = e.clientY - container.getBoundingClientRect().top; 
  });

  function togglePause() {
    isPaused = !isPaused;

    if (isPaused) {
      showMenu('<div>Jeu en pause</div><button onclick="togglePause()">Reprendre</button>');
      info.style.display = 'none';
    } else {
      menus.style.display = 'none';
      info.style.display = 'block';
      loop();
    }
  }

  function bordure() {
    player.x = Math.max(player.size, Math.min(width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(height - player.size, player.y));
  }

  function showMenu(content) {
    menus.innerHTML = '';
    menus.style.display = 'flex';
    if (typeof content === 'string') menus.innerHTML = content;
    else menus.appendChild(content);
  }

  function startGame() {
    gameStarted = true;
    menus.style.display = 'none';
    spawnEnemies();
    loop();
  }

  function reload() {
    player.isReloading = true;
    player.reloadStartTime = Date.now();
    setTimeout(() => {
      player.ammo = 25;
      ammoDisplay.textContent = player.ammo;
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
    ammoDisplay.textContent = player.ammo;
    const bulletSize = player.bigBullets ? 10 : 5;
    if (player.multiShot) {
      bullets.push({ x: player.x, y: player.y, angle: player.angle + 0.1, size: bulletSize });
      bullets.push({ x: player.x, y: player.y, angle: player.angle - 0.1, size: bulletSize });
    } else {
      bullets.push({ x: player.x, y: player.y, angle: player.angle, size: bulletSize });
    }
  }

  function update() {
    if (!gameStarted || gameOver || pendingUpgrade) return;

    // Movement with touch joystick
    if (moveVector.x !== 0 || moveVector.y !== 0) {
      const len = Math.hypot(moveVector.x, moveVector.y);
      const nx = moveVector.x / len;
      const ny = moveVector.y / len;
      player.x += nx * player.speed;
      player.y += ny * player.speed;
      bordure();
    } else {
      // Keyboard movement fallback
      if (keys['z']) player.y -= player.speed;
      if (keys['s']) player.y += player.speed;
      if (keys['q']) player.x -= player.speed;
      if (keys['d']) player.x += player.speed;
      bordure();
    }

    // Calculate player angle based on mouse or joystick direction
    if (moveVector.x !== 0 || moveVector.y !== 0) {
      player.angle = Math.atan2(moveVector.y, moveVector.x);
    } else {
      const dx = mouseX - player.x, dy = mouseY - player.y;
      player.angle = Math.atan2(dy, dx);
    }

    bullets.forEach((b, i) => {
      b.x += Math.cos(b.angle) * bulletSpeed;
      b.y += Math.sin(b.angle) * bulletSpeed;
      enemies.forEach(e => {
        if (e.alive && Math.hypot(b.x - e.x, b.y - e.y) < e.size + b.size) {
          e.hp -= 1 + damageBonus;
          if (e.hp <= 0) {
            e.alive = false;
            if (e.isBoss) {
              const reward = Math.random() < 0.5 ? 'multiShot' : 'bigBullets';
              if (reward === 'multiShot') player.multiShot = true;
              if (reward === 'bigBullets') player.bigBullets = true;
            }
            score++;
            scoreDisplay.textContent = score;
          }
          bullets.splice(i, 1);
        }
      });
    });

    enemies.forEach(e => {
      if (!e.alive) return;
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
      if (dist < e.size + player.size) {
        e.alive = false;
        player.health--;
        healthDisplay.textContent = player.health;
        if (player.health <= 0) {
          gameOver = true;
          showMenu(`<div>Tu es mort à la vague ${wave} avec un score de ${score}</div><button onclick="location.reload()">Rejouer</button>`);
        }
      }
    });

    if (enemies.every(e => !e.alive)) {
      wave++;
      waveDisplay.textContent = wave;
      pendingUpgrade = true;
      info.style.display = 'none';
      showUpgradeMenu();
    }
  }

  function updateChats() {
    chats.forEach((chat, i) => {
      const dx = player.x - chat.x, dy = player.y - chat.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 20) {
        chat.x += (dx / dist) * chat.speed;
        chat.y += (dy / dist) * chat.speed;
      }
      enemies.forEach(e => {
        if (e.alive && Math.hypot(chat.x - e.x, chat.y - e.y) < chat.size + e.size) {
          e.alive = false;
          croixNoisette.push({ x: chat.x, y: chat.y });
          chats.splice(i, 1);
          score++;
          scoreDisplay.textContent = score;
        }
      });
    });
  }

  const backgroundCanvas = document.createElement('canvas');
  const bgCtx = backgroundCanvas.getContext('2d');

  function drawBackground() {
    ctx.drawImage(backgroundCanvas, 0, 0);
  }

  function createBackground() {
    backgroundCanvas.width = width;
    backgroundCanvas.height = height;

    // Fond herbe clair
    bgCtx.fillStyle = '#88cc55';
    bgCtx.fillRect(0, 0, width, height);

    // Petits détails d'herbe (points verts foncés)
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      bgCtx.fillStyle = `rgba(34, 85, 12, ${Math.random() * 0.5 + 0.3})`;
      bgCtx.beginPath();
      bgCtx.ellipse(x, y, size * 0.5, size, 0, 0, Math.PI * 2);
      bgCtx.fill();
    }

    // Fleurs stylisées (cercles + pétales)
    const flowerColors = ['#ff6699', '#ffcc33', '#ff9966', '#ff66cc', '#cc3366'];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const petalSize = 5;
      const centerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

      // Pétales (4 autour)
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

      // Centre fleur
      bgCtx.fillStyle = centerColor;
      bgCtx.beginPath();
      bgCtx.arc(x, y, petalSize * 0.8, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  function draw() {
    drawBackground();

    // --- Joueur (triangle vert) ---
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

    // --- Barre de recharge ---
    if (player.isReloading) {
      const elapsed = Date.now() - player.reloadStartTime;
      const percent = Math.min(elapsed / player.reloadTime, 1);
      ctx.fillStyle = 'black';
      ctx.fillRect(player.x - 20, player.y + player.size + 10, 40, 6);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(player.x - 20, player.y + player.size + 10, 40 * percent, 6);
    }

    // --- Balles ---
    bullets.forEach(b => {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- Chats (dessin "chat") ---
    chats.forEach(chat => {
      // Corps
      ctx.fillStyle = '#ffaa33';
      ctx.beginPath();
      ctx.ellipse(chat.x, chat.y, chat.size * 1.2, chat.size, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tête
      ctx.fillStyle = '#ffaa33';
      ctx.beginPath();
      ctx.arc(chat.x, chat.y - chat.size * 1.2, chat.size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Oreilles
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

      // Yeux
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.ellipse(chat.x - chat.size * 0.25, chat.y - chat.size * 1.2, chat.size * 0.15, chat.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(chat.x + chat.size * 0.25, chat.y - chat.size * 1.2, chat.size * 0.15, chat.size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Petite bouche
      ctx.beginPath();
      ctx.moveTo(chat.x, chat.y - chat.size * 1.0);
      ctx.lineTo(chat.x - chat.size * 0.15, chat.y - chat.size * 0.85);
      ctx.lineTo(chat.x + chat.size * 0.15, chat.y - chat.size * 0.85);
      ctx.closePath();
      ctx.fillStyle = '#cc6600';
      ctx.fill();

      // Nom
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText("Noisette", chat.x, chat.y - chat.size - 10);
    });

    // --- Ennemis ---
    enemies.forEach(e => {
      if (!e.alive) return;

      if (e.isBoss) {
        // Dessin oiseau boss
        const size = e.size;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.speed * 0.1); // rotation légère pour effet dynamique

        // Corps (ellipse)
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.7, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tête (cercle)
        ctx.fillStyle = '#cc00cc';
        ctx.beginPath();
        ctx.arc(0, -size * 1.0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Bec (triangle)
        ctx.fillStyle = '#ff88ff';
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.3);
        ctx.lineTo(size * 0.3, -size * 0.9);
        ctx.lineTo(-size * 0.3, -size * 0.9);
        ctx.closePath();
        ctx.fill();

        // Ailes (2 ellipses)
        ctx.fillStyle = '#dd00dd';
        ctx.beginPath();
        ctx.ellipse(-size * 0.8, 0, size * 0.3, size * 0.8, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(size * 0.8, 0, size * 0.3, size * 0.8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Nom et HP
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);

      } else {
        // Libellule ou Souris stylisée

        if (e.name.startsWith("Libellule")) {
          // Corps libellule (allongé)
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.size * 0.5, e.size * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ailes (4)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          const wingLength = e.size * 1.8;
          const wingWidth = e.size * 0.5;

          // Ailes haut gauche
          ctx.beginPath();
          ctx.ellipse(e.x - wingWidth, e.y - wingLength * 0.5, wingWidth, wingLength, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Ailes haut droite
          ctx.beginPath();
          ctx.ellipse(e.x + wingWidth, e.y - wingLength * 0.5, wingWidth, wingLength, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Ailes bas gauche
          ctx.beginPath();
          ctx.ellipse(e.x - wingWidth, e.y + wingLength * 0.5, wingWidth, wingLength, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Ailes bas droite
          ctx.beginPath();
          ctx.ellipse(e.x + wingWidth, e.y + wingLength * 0.5, wingWidth, wingLength, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Tête (cercle)
          ctx.fillStyle = '#b22222';
          ctx.beginPath();
          ctx.arc(e.x, e.y - e.size * 1.2, e.size * 0.6, 0, Math.PI * 2);
          ctx.fill();

          // Yeux (2 petits points)
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(e.x - e.size * 0.2, e.y - e.size * 1.3, e.size * 0.1, 0, Math.PI * 2);
          ctx.arc(e.x + e.size * 0.2, e.y - e.size * 1.3, e.size * 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Nom & HP
          ctx.fillStyle = 'white';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);

        } else if (e.name.startsWith("Souris")) {
          // Corps souris
          ctx.fillStyle = '#a0522d';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.size * 1.2, e.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tête souris
          ctx.fillStyle = '#8b4513';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.0, e.y - e.size * 0.2, e.size * 0.7, 0, Math.PI * 2);
          ctx.fill();

          // Oreilles souris
          ctx.fillStyle = '#deb887';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.4, e.y - e.size * 0.8, e.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e.x + e.size * 0.7, e.y - e.size * 0.9, e.size * 0.25, 0, Math.PI * 2);
          ctx.fill();

          // Yeux souris
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(e.x + e.size * 1.0, e.y - e.size * 0.3, e.size * 0.15, 0, Math.PI * 2);
          ctx.fill();

          // Queue souris (ligne courbée)
          ctx.strokeStyle = '#8b4513';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(e.x - e.size * 1.2, e.y + e.size * 0.5);
          ctx.quadraticCurveTo(e.x - e.size * 1.8, e.y + e.size * 1.5, e.x - e.size * 1.0, e.y + e.size * 2.0);
          ctx.stroke();

          // Nom & HP
          ctx.fillStyle = 'white';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(e.name + " " + e.hp + "❤", e.x, e.y - e.size - 10);
        }
      }
    });

    // --- Croix Noisette ---
    croixNoisette.forEach(c => {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5; // Épaissir les traits
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 20); // plus long
      ctx.lineTo(c.x, c.y + 20);
      ctx.moveTo(c.x - 20, c.y);
      ctx.lineTo(c.x + 20, c.y);
      ctx.stroke();
    });
  }

  function loop() {
    if (!isPaused) {
      width = canvas.width;
      height = canvas.height;
      update();
      updateChats();

      if (isShooting) shoot();

      draw();
      requestAnimationFrame(loop);
    }
  }

  function showUpgradeMenu() {
    const menu = document.createElement('div');
    menu.innerHTML = '<div>Choisis ton bonus :</div>';
    const upgrades = [
      { id: 'damage', label: '+ Dégâts' },
      { id: 'firerate', label: '+ Vitesse des balles' },
      { id: 'speed', label: '+ Vitesse de déplacement' },
      { id: 'heart', label: '+1 vie' },
      { id: 'reloadBoost', label: 'Recharge plus rapide' }
    ];
    const selected = upgrades.sort(() => 0.5 - Math.random()).slice(0, 2);
    selected.forEach(upg => {
      const btn = document.createElement('button');
      btn.textContent = upg.label;
      btn.onclick = () => chooseUpgrade(upg.id);
      menu.appendChild(btn);
    });
    showMenu(menu);
  }

  function chooseUpgrade(type) {
    if(type === 'damage') damageBonus++;
    if(type === 'firerate') bulletSpeed += 2;
    if(type === 'speed') player.speed += 0.3;
    if(type === 'heart') { player.health++; healthDisplay.textContent = player.health; }
    if(type === 'reloadBoost') player.reloadTime = Math.max(200, player.reloadTime * 0.75);
    menus.style.display = 'none';
    info.style.display = 'block';
    pendingUpgrade = false;
    spawnEnemies();
  }

  function spawnEnemies() {
    enemies = [];
    const isBossWave = wave % 5 === 0;
    const safeDistance = 400;

    if (isBossWave) {
      let x, y, dist;
      do {
        x = Math.random() * width;
        y = Math.random() * height;
        dist = Math.hypot(player.x - x, player.y - y);
      } while (dist < safeDistance);
      enemies.push({ x, y, size: 60, speed: 2 + wave * 0.05, alive: true, hp: 50 + wave * 3, isBoss: true, name: "Oiseau" });
    }

    const total = Math.floor(8 + wave * 1.5);
    for (let i = 0; i < total; i++) {
      let x, y, dist;
      do {
        x = Math.random() * width;
        y = Math.random() * height;
        dist = Math.hypot(player.x - x, player.y - y);
      } while (dist < safeDistance);
      enemies.push({ x, y, size: 18 + wave * 0.3, speed: 1.8 + Math.log(wave + 1) * 0.6, alive: true, hp: wave + Math.floor(wave / 2), isBoss: false, name: "Libellule" });
    }

    let x, y, dist;
    do {
      x = Math.random() * width;
      y = Math.random() * height;
      dist = Math.hypot(player.x - x, player.y - y);
    } while (dist < safeDistance);
    enemies.push({ x, y, size: 30 + wave * 1.5, speed: 1.2 + (wave * 0.2), alive: true, hp: wave * 4, isBoss: false, name: "Souris Z-" + wave });
  }

  showMenu(`<div>Entrez votre nom de guerrier galactique :</div><input type="text" id="playerNameInput" placeholder="MC Alex" /><button onclick="playerName = document.getElementById('playerNameInput').value || 'MC Alex'; startGame()">Démarrer</button>`);

</script>

</body>
</html>
