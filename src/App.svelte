<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Littledrop</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      overflow: hidden;
      background: #fdfcfa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      touch-action: none;
    }
    
    #gameCanvas {
      display: block;
      cursor: pointer;
    }
    
    .ui-button {
      position: fixed;
      top: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid #ddd;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.1s;
      z-index: 1000;
    }
    
    .ui-button:hover {
      transform: scale(1.05);
    }
    
    .ui-button:active {
      transform: scale(0.95);
    }
    
    #pauseBtn {
      left: 20px;
    }
    
    #muteBtn {
      right: 20px;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <button id="pauseBtn" class="ui-button">⏸</button>
  <button id="muteBtn" class="ui-button">🔊</button>

  <script>
    // Audio Manager
    class AudioManager {
      constructor() {
        this.ctx = null;
        this.muted = false;
        this.master = null;
        //this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C major pentatonic
        this.scale = [
          220.00, 246.94, 261.63, 293.66, 329.63, 392.00,
          440.00, 493.88, 523.25, 587.33, 659.25, 784.00, 880.00
        ]; // A minor pentatonic (A3–A5)


        this.initialized = false;
      }

      init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.5;
        this.initialized = true;
      }

      resume() {
        if (!this.initialized) this.init();
        if (this.ctx.state === 'suspended') return this.ctx.resume();
      }

      playXylophoneNote(index = 0, duration = 0.35) {
        if (this.muted || !this.initialized) return;
        const freq = this.scale[Math.abs(index) % this.scale.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        const now = this.ctx.currentTime;
        osc.start(now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.stop(now + duration + 0.02);
      }

      playCollisionSound() {
        if (this.muted || !this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 150;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        const now = this.ctx.currentTime;
        osc.start(now);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.stop(now + 0.12);
      }

      setMuted(v) {
        this.muted = v;
        if (this.master) this.master.gain.value = v ? 0 : 0.5;
      }
    }

    // Game
    class LittledropGame {
      constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        
        this.worldWidth = 2000;
        this.worldHeight = 2000;
        
        this.camera = { x: 1000, y: 1000 };
        this.player = {
          x: 1000,
          y: 1000,
          vx: 0,
          vy: 0,
          radius: 18,
          speed: 160,
          isDragging: false,
          inputTarget: null,
          body: null
        };
        
        this.ripples = [];
        this.entities = [];
        this.paused = false;
        this.audioManager = new AudioManager();
        
        this.lastTime = performance.now();
        this.rippleTimer = 0;
        
        this.setupPhysics();
        this.setupCanvas();
        this.setupEntities();
        this.setupInput();
        this.setupUI();
        
        this.loop();
      }

      setupPhysics() {
        const { Engine, Bodies, World } = Matter;
        this.engine = Engine.create();
        this.engine.gravity.y = 0;
        
        // Player body
        this.player.body = Bodies.circle(this.player.x, this.player.y, this.player.radius, {
          frictionAir: 0.08,
          restitution: 0.3,
          density: 0.002,
          label: 'player'
        });
        World.add(this.engine.world, this.player.body);
        
        // Collision detection
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
          event.pairs.forEach(pair => {
            if (pair.bodyA.label === 'player' || pair.bodyB.label === 'player') {
              this.audioManager.playCollisionSound();
            }
          });
        });
      }

      setupCanvas() {
        const resize = () => {
          this.canvas.width = window.innerWidth * this.dpr;
          this.canvas.height = window.innerHeight * this.dpr;
          this.canvas.style.width = window.innerWidth + 'px';
          this.canvas.style.height = window.innerHeight + 'px';
        };
        resize();
        window.addEventListener('resize', resize);
      }

      setupEntities() {
        const { Bodies, World } = Matter;
        
        // Add rocks (static)
        for (let i = 0; i < 8; i++) {
          const x = 400 + Math.random() * 1200;
          const y = 400 + Math.random() * 1200;
          const radius = 10 + Math.random() * 30;
          const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'rock' });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'rock', body, radius });
        }
        
        // Add lily pads (static)
        for (let i = 0; i < 6; i++) {
          const x = 300 + Math.random() * 1400;
          const y = 300 + Math.random() * 1400;
          const radius = 45;
          const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'lilypad' });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'lilypad', body, radius });
        }
        
        // Add leaves (dynamic, light)
        for (let i = 0; i < 10; i++) {
          const x = 300 + Math.random() * 1400;
          const y = 300 + Math.random() * 1400;
          const radius = 20;
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.1,
            restitution: 0.4,
            density: 0.0005,
            label: 'leaf'
          });
          World.add(this.engine.world, body);
          this.entities.push({
            type: 'leaf',
            body,
            radius,
            drift: { vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 }
          });
        }
        
        // Add fish (dynamic with AI)
        for (let i = 0; i < 5; i++) {
          const x = 400 + Math.random() * 1200;
          const y = 400 + Math.random() * 1200;
          const radius = 16;
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.15,
            density: 0.001,
            label: 'fish'
          });
          World.add(this.engine.world, body);
          this.entities.push({
            type: 'fish',
            body,
            radius,
            fearRadius: 150,
            fleeTimer: 0,
            targetX: x,
            targetY: y
          });
        }
      }

      setupInput() {
        const getPointer = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          
          const x = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
          const y = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
          
          return {
            x: x + this.camera.x - this.canvas.width / 2 / this.dpr,
            y: y + this.camera.y - this.canvas.height / 2 / this.dpr
          };
        };

        const onDown = (e) => {
          e.preventDefault();
          this.audioManager.resume();
          const pointer = getPointer(e);
          this.player.isDragging = true;
          this.player.inputTarget = pointer;
          this.createRipple(pointer.x, pointer.y);
        };

        const onMove = (e) => {
          if (!this.player.isDragging) return;
          e.preventDefault();
          this.player.inputTarget = getPointer(e);
        };

        const onUp = (e) => {
          e.preventDefault();
          this.player.isDragging = false;
        };

        this.canvas.addEventListener('mousedown', onDown);
        this.canvas.addEventListener('mousemove', onMove);
        this.canvas.addEventListener('mouseup', onUp);
        this.canvas.addEventListener('touchstart', onDown);
        this.canvas.addEventListener('touchmove', onMove);
        this.canvas.addEventListener('touchend', onUp);
      }

      setupUI() {
        document.getElementById('pauseBtn').addEventListener('click', () => {
          this.paused = !this.paused;
          document.getElementById('pauseBtn').textContent = this.paused ? '▶' : '⏸';
        });

        document.getElementById('muteBtn').addEventListener('click', () => {
          this.audioManager.setMuted(!this.audioManager.muted);
          document.getElementById('muteBtn').textContent = this.audioManager.muted ? '🔇' : '🔊';
        });
      }

      createRipple(x, y) {
        const maxRadius = 220 + Math.random() * 60;
        this.ripples.push({ x, y, age: 0, life: 900, maxRadius });
        const noteIndex = Math.floor(Math.random() * 13);
        this.audioManager.playXylophoneNote(noteIndex);
      }

      update(dt) {
        if (this.paused) return;
        
        const dtSec = dt / 1000;
        Matter.Engine.update(this.engine, dt);
        
        // Update player movement
        if (this.player.inputTarget) {
          const dx = this.player.inputTarget.x - this.player.body.position.x;
          const dy = this.player.inputTarget.y - this.player.body.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            const force = 0.0008;
            Matter.Body.applyForce(this.player.body, this.player.body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force
            });
          }
        }
        
        this.player.x = this.player.body.position.x;
        this.player.y = this.player.body.position.y;
        
        // Ripple creation based on movement
        this.rippleTimer += dt;
        const speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
        if (speed > 0.5 && this.rippleTimer > 250) {
          this.createRipple(this.player.x, this.player.y);
          this.rippleTimer = 0;
        }
        
        // Update ripples
        this.ripples = this.ripples.filter(r => {
          r.age += dt;
          return r.age < r.life;
        });
        
        // Update fish AI
        this.entities.forEach(entity => {
          if (entity.type === 'fish') {
            const dx = this.player.x - entity.body.position.x;
            const dy = this.player.y - entity.body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < entity.fearRadius) {
              // Flee from player
              const fleeForce = 0.0005;
              const nx = -dx / dist;
              const ny = -dy / dist;
              Matter.Body.applyForce(entity.body, entity.body.position, {
                x: nx * fleeForce,
                y: ny * fleeForce
              });
              entity.fleeTimer = 2000;
            } else if (entity.fleeTimer <= 0) {
              // Gentle drift
              if (Math.random() < 0.01) {
                entity.targetX = 400 + Math.random() * 1200;
                entity.targetY = 400 + Math.random() * 1200;
              }
              const tdx = entity.targetX - entity.body.position.x;
              const tdy = entity.targetY - entity.body.position.y;
              const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
              if (tdist > 10) {
                const driftForce = 0.0001;
                Matter.Body.applyForce(entity.body, entity.body.position, {
                  x: (tdx / tdist) * driftForce,
                  y: (tdy / tdist) * driftForce
                });
              }
            } else {
              entity.fleeTimer -= dt;
            }
          } else if (entity.type === 'leaf' && entity.drift) {
            // Apply gentle drift to leaves
            const driftForce = 0.00005;
            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: entity.drift.vx * driftForce,
              y: entity.drift.vy * driftForce
            });
          }
        });
        
        // Update camera (smooth follow)
        const targetCameraX = this.player.x;
        const targetCameraY = this.player.y;
        this.camera.x += (targetCameraX - this.camera.x) * 0.12;
        this.camera.y += (targetCameraY - this.camera.y) * 0.12;
        
        // Clamp camera to world bounds
        const halfW = this.canvas.width / 2 / this.dpr;
        const halfH = this.canvas.height / 2 / this.dpr;
        this.camera.x = Math.max(halfW, Math.min(this.worldWidth - halfW, this.camera.x));
        this.camera.y = Math.max(halfH, Math.min(this.worldHeight - halfH, this.camera.y));
      }

      render() {
        const ctx = this.ctx;
        const dpr = this.dpr;
        
        ctx.save();
        ctx.scale(dpr, dpr);
        
        // Clear
        ctx.fillStyle = '#fdfcfa';
        ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Transform to world space
        ctx.translate(-this.camera.x + this.canvas.width / 2 / dpr, -this.camera.y + this.canvas.height / 2 / dpr);
        
        // Draw world boundary
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Draw entities
        this.entities.forEach(entity => {
          const pos = entity.body.position;
          const time = performance.now() / 1000;
          
          ctx.save();
          ctx.translate(pos.x, pos.y);
          
          // Breathing animation
          const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
          ctx.scale(breathScale, breathScale);
          
          if (entity.type === 'rock') {
            ctx.fillStyle = '#e9e5df';
            ctx.strokeStyle = '#d5d1cb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (entity.type === 'lilypad') {
            ctx.fillStyle = '#d3e8c6';
            ctx.strokeStyle = '#a8c99e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.2, entity.radius * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Notch
            ctx.fillStyle = '#fdfcfa';
            ctx.beginPath();
            ctx.moveTo(entity.radius * 0.7, 0);
            ctx.lineTo(entity.radius * 1.2, -5);
            ctx.lineTo(entity.radius * 1.2, 5);
            ctx.fill();
          } else if (entity.type === 'leaf') {
            ctx.fillStyle = '#cbecc7';
            ctx.strokeStyle = '#a3d69d';
            ctx.lineWidth = 1.5;
            ctx.rotate(entity.body.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (entity.type === 'fish') {
            const vx = entity.body.velocity.x;
            const flipX = vx < 0 ? -1 : 1;
            ctx.scale(flipX, 1);
            ctx.fillStyle = '#ff9966';
            ctx.strokeStyle = '#ff7744';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-entity.radius * 1.5, 0);
            ctx.lineTo(-entity.radius * 2.2, -entity.radius * 0.6);
            ctx.lineTo(-entity.radius * 2.2, entity.radius * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          
          ctx.restore();
        });
        
        // Draw player
        const playerBreath = 1 + 0.03 * Math.sin(performance.now() / 400);
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.scale(playerBreath, playerBreath);
        
        // Drop gradient
        const gradient = ctx.createRadialGradient(0, -3, 0, 0, 0, this.player.radius);
        gradient.addColorStop(0, '#e8f7ff');
        gradient.addColorStop(0.7, '#bfe7ff');
        gradient.addColorStop(1, '#8dd5ff');
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#7dbfdf';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-4, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw ripples
        this.ripples.forEach(r => {
          const progress = r.age / r.life;
          const radius = r.maxRadius * progress;
          const alpha = 1 - progress;
          
          ctx.strokeStyle = `rgba(127, 191, 223, ${alpha * 0.5})`;
          ctx.lineWidth = 3 * (1 - progress);
          ctx.beginPath();
          ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        });
        
        ctx.restore();
      }

      loop() {
        const now = performance.now();
        const dt = Math.min(now - this.lastTime, 100);
        this.lastTime = now;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame(() => this.loop());
      }
    }

    // Start game
    window.addEventListener('load', () => {
      new LittledropGame();
    });
  </script>
</body>
</html>