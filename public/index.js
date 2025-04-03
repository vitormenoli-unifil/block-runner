let loggedUser = null;
let hero = null, obstacles = [], coins = [];
let score = 0, gameOver = false, gameLoopInterval;
let canvas, ctx;
async function fetchUserData(username) {
  try {
    const res = await fetch(`/api/user?username=${username}`);
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Erro ao buscar dados do usuário:', err);
    return null;
  }
}
if (localStorage.getItem('loggedUser')) {
  const stored = JSON.parse(localStorage.getItem('loggedUser'));
  if (stored && stored.username) {
    fetchUserData(stored.username).then((data) => {
      if (data) {
        loggedUser = data;
        localStorage.setItem('loggedUser', JSON.stringify({ username: loggedUser.username }));
        startGame();
      }
    });
  }
}
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      const userData = await fetchUserData(username);
      if (userData) {
        loggedUser = userData;
        localStorage.setItem('loggedUser', JSON.stringify({ username: loggedUser.username }));
        startGame();
      }
    }
  } catch (err) {
    console.error(err);
  }
});
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
});
function startGame() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'none';
  document.getElementById('inventoryScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  document.getElementById('welcomeMsg').innerText = 'Bem-vindo, ' + loggedUser.username;
  updateCoinDisplay();
  initGame();
}
function updateCoinDisplay() {
  document.getElementById('coinDisplay').innerText = 'Moedas: ' + loggedUser.coinCount;
}
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  hero = {
    x: 50,
    y: 200,
    width: 40,
    height: 90,
    dy: 0,
    gravity: 0.5,
    jumpPower: -10,
    grounded: false,
    canDoubleJump: false,
    color: loggedUser.currentColor ? loggedUser.currentColor : 'blue'
  };
  obstacles = [];
  coins = [];
  score = 0;
  gameOver = false;
  cancelAnimationFrame(gameLoopInterval);
  gameLoop();
}
function restartGame() {
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  initGame();
}
function openShop() {
  const shopScreen = document.getElementById('shopScreen');
  shopScreen.innerHTML = `
    <h2>Loja</h2>
    <p>Moedas: <span id="shopCoinDisplay">${loggedUser.coinCount}</span></p>
    <button id="btnRed" onclick="buyColor('red', 5)">Vermelho - 5 moedas</button>
    <button id="btnGreen" onclick="buyColor('green', 10)">Verde - 10 moedas</button>
    <button id="btnPurple" onclick="buyColor('purple', 15)">Roxo - 15 moedas</button>
    <button onclick="closeShop()">Fechar Loja</button>
  `;
  if (loggedUser.inventory && loggedUser.inventory.includes('red')) {
    document.getElementById('btnRed').disabled = true;
  }
  if (loggedUser.inventory && loggedUser.inventory.includes('green')) {
    document.getElementById('btnGreen').disabled = true;
  }
  if (loggedUser.inventory && loggedUser.inventory.includes('purple')) {
    document.getElementById('btnPurple').disabled = true;
  }
  shopScreen.style.display = 'flex';
}
function closeShop() {
  document.getElementById('shopScreen').style.display = 'none';
}
async function openInventory() {
  const data = await fetchUserData(loggedUser.username);
  if (data) {
    loggedUser.inventory = data.inventory;
    loggedUser.currentColor = data.currentColor;
  }
  const inventoryScreen = document.getElementById('inventoryScreen');
  const inventoryList = document.getElementById('inventoryList');
  let currentColorDisplay = document.getElementById('currentColorDisplay');
  if (!currentColorDisplay) {
    currentColorDisplay = document.createElement('p');
    currentColorDisplay.id = 'currentColorDisplay';
    inventoryScreen.insertBefore(currentColorDisplay, inventoryList);
  }
  currentColorDisplay.innerText = 'Cor atual: ' + loggedUser.currentColor;
  let availableColors = loggedUser.inventory ? [...loggedUser.inventory] : [];
  if (!availableColors.includes('blue')) {
    availableColors.push('blue');
  }
  inventoryList.innerHTML = "";
  if (availableColors.length > 0) {
    availableColors.forEach(color => {
      const li = document.createElement('li');
      li.innerText = color;
      li.style.color = color;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        loggedUser.currentColor = color;
        hero.color = color;
        currentColorDisplay.innerText = 'Cor atual: ' + color;
      });
      inventoryList.appendChild(li);
    });
  } else {
    inventoryList.innerHTML = "<li>Sem itens no inventário.</li>";
  }
  inventoryScreen.style.display = 'flex';
}
function closeInventory() {
  document.getElementById('inventoryScreen').style.display = 'none';
}
async function buyColor(color, price) {
  if (loggedUser.coinCount >= price) {
    try {
      const res = await fetch('/api/buyColor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedUser.username, color, price })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        loggedUser.coinCount = data.coinCount;
        loggedUser.inventory = data.inventory;
        loggedUser.currentColor = color;
        hero.color = color;
        updateCoinDisplay();
        closeShop();
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    alert("Moedas insuficientes para essa compra!");
  }
}
async function updateCoins(increment) {
  try {
    const res = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loggedUser.username, increment })
    });
    const data = await res.json();
    loggedUser.coinCount = data.coinCount;
    updateCoinDisplay();
  } catch (err) {
    console.error('Erro ao atualizar moedas:', err);
  }
}
function gameLoop() {
  update();
  draw();
  if (!gameOver) {
    gameLoopInterval = requestAnimationFrame(gameLoop);
  } else {
    showGameOverScreen();
  }
}
function update() {
  hero.dy += hero.gravity;
  hero.y += hero.dy;
  if (hero.y >= 200) {
    hero.y = 200;
    hero.dy = 0;
    hero.grounded = true;
    hero.canDoubleJump = false;
  }
  if (Math.random() < 0.02) {
    obstacles.push({ x: canvas.width, y: 220, width: 20, height: Math.random() * 30 + 30 });
  }
  if (Math.random() < 0.03) {
    coins.push({ x: canvas.width, y: Math.random() * 150 + 50, width: 15, height: 15 });
  }
  obstacles.forEach((obs) => {
    obs.x -= 5;
    if (
      hero.x < obs.x + obs.width &&
      hero.x + hero.width > obs.x &&
      hero.y < obs.y + obs.height &&
      hero.y + hero.height > obs.y
    ) {
      gameOver = true;
    }
  });
  coins.forEach((coin, index) => {
    coin.x -= 5;
    if (
      hero.x < coin.x + coin.width &&
      hero.x + hero.width > coin.x &&
      hero.y < coin.y + coin.height &&
      hero.y + hero.height > coin.y
    ) {
      coins.splice(index, 1);
      score += 5;
      updateCoins(1);
    }
  });
  obstacles = obstacles.filter(obs => obs.x > -obs.width);
  coins = coins.filter(coin => coin.x > -coin.width);
  score++;
  document.getElementById('scoreDisplay').innerText = 'Score: ' + score;
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2E8B57';
  ctx.fillRect(0, 250, canvas.width, 50);
  ctx.fillStyle = hero.color;
  ctx.fillRect(hero.x, hero.y, hero.width, hero.height);
  ctx.fillStyle = 'red';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
  ctx.fillStyle = 'gold';
  coins.forEach(coin => {
    ctx.fillRect(coin.x, coin.y, coin.width, coin.height);
  });
}
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space') {
    if (hero && hero.grounded) {
      hero.dy = hero.jumpPower;
      hero.grounded = false;
      hero.canDoubleJump = true;
    } else if (hero && hero.canDoubleJump) {
      hero.dy = hero.jumpPower;
      hero.canDoubleJump = false;
    }
  }
});
function showGameOverScreen() {
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'flex';
  document.getElementById('finalScore').innerText = 'Score: ' + score;
  document.getElementById('finalCoins').innerText = 'Moedas: ' + loggedUser.coinCount;
}