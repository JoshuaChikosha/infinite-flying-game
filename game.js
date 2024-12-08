// Get Canvas and Context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Canvas Dimensions
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game State Flags
let isPaused = false;
let isGameOver = false;

// Game Variables
let player;
let background;
let stars = [];
let enemies = [];
let bullets = [];
let score = 0;
let enemySpawnInterval;
let bulletSpeed = 7;
const GAME_DURATION = 60; // Game duration in seconds
let ENEMY_SPAWN_RATE = 1500; // Initial spawn rate (ms)
const ENEMY_SPAWN_DECREASE = 100; // Decrease spawn rate by 100ms every difficulty interval
const DIFFICULTY_INTERVAL = 15000; // Increase difficulty every 15 seconds
let enemySpeedIncrease = 0.5; // Increase enemy speed by 0.5 every difficulty interval
let difficultyTimer;
let gameStartTime;

// Overlay Elements
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const resumeButton = document.getElementById("resumeButton");
const restartButton = document.getElementById("restartButton");
const gameOverIcon = document.getElementById("gameOverIcon");

// Mute Button Element
const muteButton = document.getElementById("muteButton");

// Background Music
const backgroundMusic = new Audio("music/background-music.mp3");
backgroundMusic.loop = true; // Enable looping
backgroundMusic.volume = 0.5; // Set desired volume (0.0 to 1.0)

// Sound Effects
let audioContext;

// Initialize Audio Context on first user interaction
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Play background music
  backgroundMusic.play().catch((error) => {
    console.error("Error playing background music:", error);
  });
}

// Function to play a beep sound (for shooting)
function playShootSound() {
  if (!audioContext) return; // Ensure audioContext is initialized

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Frequency in Hz
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Volume

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1); // Duration 0.1 seconds
}

// Function to play a boom sound (for explosions)
function playExplosionSound() {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // Frequency in Hz
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // Volume

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3); // Duration 0.3 seconds
}

// Function to play a layered game over sound
function playGameOverSound() {
  if (!audioContext) return;

  // First Oscillator
  const oscillator1 = audioContext.createOscillator();
  const gainNode1 = audioContext.createGain();

  oscillator1.type = "sawtooth";
  oscillator1.frequency.setValueAtTime(100, audioContext.currentTime); // Frequency in Hz
  gainNode1.gain.setValueAtTime(0.2, audioContext.currentTime); // Volume

  oscillator1.connect(gainNode1);
  gainNode1.connect(audioContext.destination);

  oscillator1.start();
  oscillator1.stop(audioContext.currentTime + 0.5); // Duration 0.5 seconds

  // Second Oscillator
  const oscillator2 = audioContext.createOscillator();
  const gainNode2 = audioContext.createGain();

  oscillator2.type = "square";
  oscillator2.frequency.setValueAtTime(200, audioContext.currentTime); // Frequency in Hz
  gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime); // Volume

  oscillator2.connect(gainNode2);
  gainNode2.connect(audioContext.destination);

  oscillator2.start();
  oscillator2.stop(audioContext.currentTime + 0.5); // Duration 0.5 seconds
}

// Particle Class
class Particle {
  constructor(x, y, dx, dy, radius, color) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = radius;
    this.color = color;
    this.alpha = 1;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.alpha -= 0.02;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.alpha <= 0;
  }
}

let particles = [];

// Function to create particles
function createParticles(x, y) {
  const colors = ["#ff0000", "#ff6666", "#ff3333", "#cc0000"];
  for (let i = 0; i < 30; i++) {
    const dx = (Math.random() - 0.5) * 4;
    const dy = (Math.random() - 0.5) * 4;
    const radius = Math.random() * 3 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, dx, dy, radius, color));
  }
}

// Update Particles
function updateParticles() {
  particles.forEach((particle, index) => {
    particle.update();
    if (particle.isDead()) {
      particles.splice(index, 1);
    }
  });
}

// Draw Particles
function drawParticles() {
  particles.forEach((particle) => {
    particle.draw(ctx);
  });
}

// Player Class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.speed = 5;
    this.movingLeft = false;
    this.movingRight = false;
    this.movingUp = false;
    this.movingDown = false;
  }

  update() {
    if (this.movingLeft) {
      this.x -= this.speed;
      if (this.x < 0) this.x = 0;
    }
    if (this.movingRight) {
      this.x += this.speed;
      if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;
    }
    if (this.movingUp) {
      this.y -= this.speed;
      if (this.y < 0) this.y = 0;
    }
    if (this.movingDown) {
      this.y += this.speed;
      if (this.y + this.height > HEIGHT) this.y = HEIGHT - this.height;
    }
  }

  draw(ctx) {
    // Draw the player as a white triangle
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y); // Top point
    ctx.lineTo(this.x, this.y + this.height); // Bottom left
    ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom right
    ctx.closePath();
    ctx.fill();
  }

  shoot() {
    const bullet = new Bullet(this.x + this.width / 2, this.y);
    bullets.push(bullet);
    playShootSound();
  }

  reset() {
    this.x = WIDTH / 2 - 20;
    this.y = HEIGHT - 60;
    this.movingLeft = false;
    this.movingRight = false;
    this.movingUp = false;
    this.movingDown = false;
  }
}

// Bullet Class
class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.speed = bulletSpeed;
  }

  update() {
    this.y -= this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = "#ff0"; // Yellow color
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  isOffScreen() {
    return this.y < 0;
  }
}

// Enemy Class
class Enemy {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.speed = speed; // Vertical speed
    this.dx = Math.random() * 2 - 1; // Horizontal speed (-1 to 1)
    this.direction = 1; // 1 for right, -1 for left
  }

  update() {
    // Move vertically
    this.y += this.speed;

    // Move horizontally
    this.x += this.dx * this.direction;

    // Check for collision with canvas boundaries
    if (this.x <= 0 || this.x + this.width >= WIDTH) {
      this.direction *= -1; // Reverse direction
    }
  }

  draw(ctx) {
    // Draw the enemy as a red rectangle. I'm a little lazy ngl
    ctx.fillStyle = "#f00";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  isOffScreen() {
    return this.y > HEIGHT;
  }
}

// Background Class
class Background {
  constructor() {
    this.speed = 2;
    this.stars = [];
    this.createStars();
  }

  createStars() {
    // Create stars with random positions and sizes
    for (let i = 0; i < 100; i++) {
      const star = {
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        radius: Math.random() * 1.5,
        speed: Math.random() * 1 + 0.5,
      };
      this.stars.push(star);
    }
  }

  update() {
    // Move stars downward to simulate scrolling
    this.stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > HEIGHT) {
        star.y = 0;
        star.x = Math.random() * WIDTH;
      }
    });
  }

  draw(ctx) {
    // Draw stars
    ctx.fillStyle = "#fff";
    this.stars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// Initialize the Game
function init() {
  // Create Player at the center bottom
  player = new Player(WIDTH / 2 - 20, HEIGHT - 60);

  // Create Background
  background = new Background();

  // Event Listeners for Keyboard Input
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // Resume Button Listener
  resumeButton.addEventListener("click", () => {
    resumeGame();
  });

  // Restart Button Listener
  restartButton.addEventListener("click", () => {
    resetGame();
  });

  // Mute Button Event Listener
  muteButton.addEventListener("click", () => {
    if (backgroundMusic.muted) {
      backgroundMusic.muted = false;
      muteButton.textContent = "Mute";
    } else {
      backgroundMusic.muted = true;
      muteButton.textContent = "Unmute";
    }
  });

  // Initialize Audio on first keypress
  window.addEventListener("keydown", initAudio, { once: true });

  // Spawn enemies at intervals
  enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);

  // Start Difficulty Timer
  difficultyTimer = setInterval(increaseDifficulty, DIFFICULTY_INTERVAL);

  // Record the start time
  gameStartTime = Date.now();

  // Start the Game Loop
  requestAnimationFrame(gameLoop);
}

// Handle Key Down Events
function handleKeyDown(e) {
  if (isGameOver) return; // Disable controls if game is over

  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      player.movingLeft = true;
      break;
    case "ArrowRight":
    case "KeyD":
      player.movingRight = true;
      break;
    case "ArrowUp":
    case "KeyW":
      player.movingUp = true;
      break;
    case "ArrowDown":
    case "KeyS":
      player.movingDown = true;
      break;
    case "Space":
      player.shoot();
      break;
    case "Escape":
      togglePause();
      break;
  }
}

// Handle Key Up Events
function handleKeyUp(e) {
  if (isGameOver) return; // Disable controls if game is over

  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      player.movingLeft = false;
      break;
    case "ArrowRight":
    case "KeyD":
      player.movingRight = false;
      break;
    case "ArrowUp":
    case "KeyW":
      player.movingUp = false;
      break;
    case "ArrowDown":
    case "KeyS":
      player.movingDown = false;
      break;
  }
}

// Spawn Enemy with Current Speed
function spawnEnemy() {
  const x = Math.random() * (WIDTH - 40); // Ensure enemy is within canvas
  const y = -40; // Start above the canvas
  const enemySpeed = 2 + score * 0.01; // Increase speed slightly based on score
  const enemy = new Enemy(x, y, enemySpeed);
  enemies.push(enemy);
}

// Increase Difficulty Over Time
function increaseDifficulty() {
  // Increase enemy spawn rate (make it spawn more frequently)
  if (ENEMY_SPAWN_RATE > 500) {
    // Set a minimum spawn rate
    ENEMY_SPAWN_RATE -= ENEMY_SPAWN_DECREASE;
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);
  }

  // bulletSpeed += 0.5; // increase bullet speed over time if I uncomment
}

// Reset the Game Without Reloading the Page
function resetGame() {
  // Reset game variables
  enemies = [];
  bullets = [];
  particles = [];
  score = 0;
  ENEMY_SPAWN_RATE = 1500;
  enemySpeedIncrease = 0.5;
  isPaused = false;
  isGameOver = false;

  // Reset player position and movement flags
  player.reset();

  // Reset enemy spawn interval
  clearInterval(enemySpawnInterval);
  enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);

  // Reset difficulty timer
  clearInterval(difficultyTimer);
  difficultyTimer = setInterval(increaseDifficulty, DIFFICULTY_INTERVAL);

  // Reset game start time
  gameStartTime = Date.now();

  // Hide overlay and game over icon
  overlay.classList.add("hidden");
  overlay.classList.remove("gameover");
  resumeButton.classList.add("hidden");
  restartButton.classList.add("hidden"); // Ensure restart button is hidden
  gameOverIcon.classList.add("hidden");

  // Restart game loop
  requestAnimationFrame(gameLoop);
}

// Resume the Game from Pause
function resumeGame() {
  if (isGameOver) return; // Do not resume if game is over

  // Reset isPaused flag
  isPaused = false;

  // Hide overlay and hide Resume button
  overlay.classList.add("hidden");
  resumeButton.classList.add("hidden");
  restartButton.classList.add("hidden"); // Optionally hide restart button when resuming from pause
  overlay.classList.remove("gameover");
  gameOverIcon.classList.add("hidden");

  // Restart enemy spawn interval
  enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_RATE);

  // Restart difficulty timer
  difficultyTimer = setInterval(increaseDifficulty, DIFFICULTY_INTERVAL);

  // Adjust gameStartTime to account for paused duration
  const pausedDuration = (Date.now() - gameStartTime) / 1000;
  gameStartTime = Date.now() - pausedDuration * 1000;

  // Restart game loop
  requestAnimationFrame(gameLoop);
}

// Toggle Pause and Unpause
function togglePause() {
  if (isGameOver) {
    // If game is over, don't allow pausing
    return;
  }

  if (!isPaused) {
    // Pause the game
    isPaused = true;
    clearInterval(enemySpawnInterval);
    clearInterval(difficultyTimer);
    showOverlay("Game Paused", "pause");
  } else {
    // Resume the game
    resumeGame();
  }
}

// Particle Update and Draw already handled

// Game Loop Function with deltaTime for screen shake
let lastFrameTime = 0;
let shake = {
  active: false,
  duration: 0,
  magnitude: 5,
};

// Function to trigger screen shake
function triggerShake(duration = 500, magnitude = 5) {
  shake.active = true;
  shake.duration = duration;
  shake.magnitude = magnitude;
}

// Update Shake
function updateShake(deltaTime) {
  if (shake.active) {
    if (shake.duration > 0) {
      const xOffset = (Math.random() * 2 - 1) * shake.magnitude;
      const yOffset = (Math.random() * 2 - 1) * shake.magnitude;
      canvas.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      shake.duration -= deltaTime;
    } else {
      shake.active = false;
      canvas.style.transform = `translate(0px, 0px)`;
    }
  }
}

// Modify showOverlay to handle particles and screen shake
function showOverlay(message, state) {
  overlayText.textContent = `${message}\nScore: ${score}`;
  overlay.classList.remove("hidden");

  if (state === "pause") {
    resumeButton.classList.remove("hidden");
    restartButton.classList.remove("hidden"); // Show restart button during pause
    gameOverIcon.classList.add("hidden");
  } else if (state === "gameover") {
    resumeButton.classList.add("hidden");
    restartButton.classList.remove("hidden"); // Show restart button on game over
    overlay.classList.add("gameover"); // Add a class for game over styling
    gameOverIcon.classList.remove("hidden"); // Show game over icon

    // Create particles at the player's position
    createParticles(player.x + player.width / 2, player.y + player.height / 2);

    // Trigger screen shake
    triggerShake();
  }
}

// Game Loop Function
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  update();
  draw();
  updateShake(deltaTime);
  updateParticles();
  drawParticles();

  if (!isPaused && !isGameOver) {
    requestAnimationFrame(gameLoop);
  }
}

let elapsedTime = 0; // Global variable to track elapsed time

function update() {
  if (!isPaused && !isGameOver) {
    player.update();
    background.update();

    // Update bullets
    bullets.forEach((bullet) => bullet.update());
    bullets = bullets.filter((bullet) => !bullet.isOffScreen());

    // Update enemies
    enemies.forEach((enemy) => enemy.update());
    enemies = enemies.filter((enemy) => !enemy.isOffScreen());

    // Check for collisions between bullets and enemies
    bullets.forEach((bullet, bIndex) => {
      enemies.forEach((enemy, eIndex) => {
        if (
          bullet.x > enemy.x &&
          bullet.x < enemy.x + enemy.width &&
          bullet.y > enemy.y &&
          bullet.y < enemy.y + enemy.height
        ) {
          // Collision detected
          bullets.splice(bIndex, 1);
          enemies.splice(eIndex, 1);
          score += 10;
          playExplosionSound();
        }
      });
    });

    // Check for collisions between player and enemies
    enemies.forEach((enemy) => {
      if (
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
      ) {
        // Collision detected
        isGameOver = true;
        clearInterval(enemySpawnInterval);
        clearInterval(difficultyTimer);
        playGameOverSound();
        showOverlay("Game Over", "gameover");
      }
    });

    // Update elapsed time
    elapsedTime = (Date.now() - gameStartTime) / 1000; // in seconds

    // Check Game Duration
    if (elapsedTime >= GAME_DURATION) {
      isGameOver = true;
      clearInterval(enemySpawnInterval);
      clearInterval(difficultyTimer);
      showOverlay(`You Survived ${GAME_DURATION} Seconds!`, "gameover");
    }
  }
}

// Draw Everything
function draw() {
  // Clear Canvas
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Draw Background
  background.draw(ctx);

  // Draw Player
  player.draw(ctx);

  // Draw Bullets
  bullets.forEach((bullet) => bullet.draw(ctx));

  // Draw Enemies
  enemies.forEach((enemy) => enemy.draw(ctx));

  // Draw Timer and Score
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText(
    `Time Left: ${Math.max(0, GAME_DURATION - Math.floor(elapsedTime))}s`,
    10,
    30
  );
  ctx.fillText(`Score: ${score}`, 10, 60);
}

// Initialize the Game when window loads
window.onload = init;
