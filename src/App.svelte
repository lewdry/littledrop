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
        this.scale = [
          220.00, 246.94, 261.63, 293.66, 329.63, 392.00,
          440.00, 493.88, 523.25, 587.33, 659.25, 784.00, 880.00, 1046.50
        ]; // A minor pentatonic (A3–A5)
        this.initialized = false;
      }

      init() {
        if (this.initialized) return;
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.master = this.ctx.createGain();
          this.master.connect(this.ctx.destination);
          this.master.gain.value = 0.6;
          this.initialized = true;
        } catch (e) {
          console.error('Failed to initialize audio context:', e);
        }
      }

      async resume() {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        try {
          if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
          }
        } catch (e) {
          console.error('Failed to resume audio context:', e);
        }
      }

      async playXylophoneNote(index = 0, duration = 0.35) {
        if (this.muted || !this.initialized) return;
        // Always try to resume audio context before playing
        await this.resume();
        if (!this.ctx || this.ctx.state !== 'running') return;
        try {
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
          gain.gain.value = 0.0001;
          gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          osc.stop(now + duration + 0.02);
        } catch (e) {
          console.error('Failed to play xylophone note:', e);
        }
      }

      async playCollisionSound() {
        if (this.muted || !this.initialized) return;
        // Always try to resume audio context before playing
        await this.resume();
        if (!this.ctx || this.ctx.state !== 'running') return;
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = 164.81;  // Higher frequency for better audibility
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(this.master);
          const now = this.ctx.currentTime;
          osc.start(now);
          gain.gain.value = 0.0001;
          gain.gain.linearRampToValueAtTime(0.08, now + 0.005);  // Increased peak volume
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);  // Shorter duration
          osc.stop(now + 0.1);
        } catch (e) {
          console.error('Failed to play collision sound:', e);
        }
      }

      setMuted(v) {
        this.muted = v;
        if (this.master) this.master.gain.value = v ? 0 : 0.6;
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
        
        // Mobile zoom configuration - adjust this variable to change zoom level
        // Higher values = more zoomed out (see more of the world)
        // Lower values = more zoomed in (see less of the world)
        this.mobileZoomFactor = 0.5;  // Default 0.5 (zoomed out to 50% of normal)
        
        this.camera = { x: 1000, y: 1000 };
        this.player = {
          x: 1000,
          y: 1000,
          vx: 0,
          vy: 0,
          radius: 18,
          speed: 20,
          isDragging: false,
          inputTarget: null,
          body: null
        };
        
        this.ripples = [];
        this.entities = [];
        this.paused = false;
        this.audioManager = new AudioManager();
        this.keys = { left: false, right: false, up: false, down: false };
        
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

  // Add hard world boundaries so objects can't leave the world
  // We make walls slightly thicker and positioned on the edges of the world
  this.boundaries = [];
  const wallThickness = 80;
  const halfW = this.worldWidth / 2;
  const halfH = this.worldHeight / 2;

  const top = Bodies.rectangle(halfW, -wallThickness / 2, this.worldWidth + wallThickness * 2, wallThickness, { isStatic: true, label: 'boundary' });
  const bottom = Bodies.rectangle(halfW, this.worldHeight + wallThickness / 2, this.worldWidth + wallThickness * 2, wallThickness, { isStatic: true, label: 'boundary' });
  const left = Bodies.rectangle(-wallThickness / 2, halfH, wallThickness, this.worldHeight + wallThickness * 2, { isStatic: true, label: 'boundary' });
  const right = Bodies.rectangle(this.worldWidth + wallThickness / 2, halfH, wallThickness, this.worldHeight + wallThickness * 2, { isStatic: true, label: 'boundary' });

  World.add(this.engine.world, [top, bottom, left, right]);
  this.boundaries.push(top, bottom, left, right);
        
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
        for (let i = 0; i < 11; i++) {
          const x = 300 + Math.random() * 1400;
          const y = 300 + Math.random() * 1400;
          const radius = 10 + Math.random() * 15;
          const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'rock' });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'rock', body, radius });
        }
        
        // Add lily pads (heavy but pushable)
        for (let i = 0; i < 9; i++) {
          const x = 100 + Math.random() * 1800;
          const y = 100 + Math.random() * 1800;
          const radius = 45;
          const angle = Math.random() * Math.PI * 2; // Random angle between 0 and 2π
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.15,  // High air friction to prevent sliding too much
            restitution: 0.2,   // Low bounciness
            density: 0.001,     // Higher density than leaves (0.0005) but still pushable
            label: 'lilypad',
            angle: angle // Set initial angle
          });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'lilypad', body, radius, angle }); // Store the angle in the entity
        }
        
        // Add leaves (dynamic, light)
        for (let i = 0; i < 13; i++) {
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
        const fishColors = [
          { fill: '#ff9966', stroke: '#ff7744' },
          { fill: '#ffcc66', stroke: '#ffaa44' },
          { fill: '#66ccff', stroke: '#44aaff' },
          { fill: '#cc99ff', stroke: '#aa77ff' },
          { fill: '#ff6699', stroke: '#ff4477' },
          { fill: '#1cd9ad', stroke: '#1cbba3' },
          { fill: '#000000', stroke: '#000000' }
        ];
        
        for (let i = 0; i < 44; i++) {
          const x = 200 + Math.random() * 1600;
          const y = 200 + Math.random() * 1600;
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
            fearRadius: 300,
            fleeTimer: 0,
            targetX: x,
            targetY: y,
            wanderAngle: Math.random() * Math.PI * 2,
            color: fishColors[i % fishColors.length]
          });
        }
      }

      setupInput() {
        const getPointer = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          
          const canvasX = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
          const canvasY = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
          
          // Account for mobile zoom
          const isMobile = window.innerHeight > window.innerWidth;
          const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;
          
          // Convert from canvas coordinates to world coordinates with zoom
          const worldX = this.camera.x + (canvasX - this.canvas.width / 2 / this.dpr) / zoomScale;
          const worldY = this.camera.y + (canvasY - this.canvas.height / 2 / this.dpr) / zoomScale;
          
          return { x: worldX, y: worldY };
        };

        const onDown = async (e) => {
          e.preventDefault();
          try {
            await this.audioManager.resume();
          } catch (err) {
            console.warn('Audio initialization failed, continuing without sound:', err);
          }
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
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') this.keys.left = true;
          if (e.key === 'ArrowRight') this.keys.right = true;
          if (e.key === 'ArrowUp') this.keys.up = true;
          if (e.key === 'ArrowDown') this.keys.down = true;
        });
        
        window.addEventListener('keyup', (e) => {
          if (e.key === 'ArrowLeft') this.keys.left = false;
          if (e.key === 'ArrowRight') this.keys.right = false;
          if (e.key === 'ArrowUp') this.keys.up = false;
          if (e.key === 'ArrowDown') this.keys.down = false;
        });
      }

      setupUI() {
        document.getElementById('pauseBtn').addEventListener('click', async () => {
          try {
            await this.audioManager.resume();  // Initialize/resume audio on UI interaction
          } catch (err) {
            console.warn('Audio initialization failed, continuing without sound:', err);
          }
          this.paused = !this.paused;
          document.getElementById('pauseBtn').textContent = this.paused ? '▶' : '⏸';
        });

        document.getElementById('muteBtn').addEventListener('click', async () => {
          try {
            await this.audioManager.resume();  // Initialize/resume audio on UI interaction
          } catch (err) {
            console.warn('Audio initialization failed, continuing without sound:', err);
          }
          this.audioManager.setMuted(!this.audioManager.muted);
          document.getElementById('muteBtn').textContent = this.audioManager.muted ? '🔇' : '🔊';
        });
      }

      createRipple(x, y) {
        const maxRadius = 220 + Math.random() * 60;
        this.ripples.push({ x, y, age: 0, life: 900, maxRadius });
        const noteIndex = Math.floor(Math.random() * 14);
        this.audioManager.playXylophoneNote(noteIndex);
      }

      update(dt) {
        if (this.paused) return;
        
        const dtSec = dt / 1000;
        Matter.Engine.update(this.engine, dt);
        
        // Update player movement from mouse/touch
        if (this.player.inputTarget) {
          const dx = this.player.inputTarget.x - this.player.body.position.x;
          const dy = this.player.inputTarget.y - this.player.body.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            const force = 0.0015; // was 0.0008
            Matter.Body.applyForce(this.player.body, this.player.body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force
            });
          }
        }
        
        // Update player movement from keyboard
        let kbForceX = 0;
        let kbForceY = 0;
        const kbForce = 0.0008;
        
        if (this.keys.left) kbForceX -= kbForce;
        if (this.keys.right) kbForceX += kbForce;
        if (this.keys.up) kbForceY -= kbForce;
        if (this.keys.down) kbForceY += kbForce;
        
        if (kbForceX !== 0 || kbForceY !== 0) {
          Matter.Body.applyForce(this.player.body, this.player.body.position, {
            x: kbForceX,
            y: kbForceY
          });
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
        
        // Update fish AI with schooling behavior
        const fishEntities = this.entities.filter(e => e.type === 'fish');
        
        this.entities.forEach(entity => {
          if (entity.type === 'fish') {
            const dx = this.player.x - entity.body.position.x;
            const dy = this.player.y - entity.body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check distance to world edges
            const edgeBuffer = 100;
            const distToLeftEdge = entity.body.position.x;
            const distToRightEdge = this.worldWidth - entity.body.position.x;
            const distToTopEdge = entity.body.position.y;
            const distToBottomEdge = this.worldHeight - entity.body.position.y;
            
            let edgeAvoidX = 0;
            let edgeAvoidY = 0;
            
            // Add force to avoid edges
            if (distToLeftEdge < edgeBuffer) edgeAvoidX += 1;
            if (distToRightEdge < edgeBuffer) edgeAvoidX -= 1;
            if (distToTopEdge < edgeBuffer) edgeAvoidY += 1;
            if (distToBottomEdge < edgeBuffer) edgeAvoidY -= 1;
            
            if (dist < entity.fearRadius) {
              // Flee from player
              const fleeForce = 0.0006;
              const nx = -dx / dist;
              const ny = -dy / dist;
              Matter.Body.applyForce(entity.body, entity.body.position, {
          x: nx * fleeForce,
          y: ny * fleeForce
              });
              entity.fleeTimer = 2000;
            } else if (entity.fleeTimer <= 0) {
              // Initialize wanderAngle and wanderChangeTimer if not exists
              if (entity.wanderAngle === undefined) {
          entity.wanderAngle = Math.random() * Math.PI * 2;
          entity.wanderChangeTimer = 0;
              }
              
              // Update wander angle periodically
              entity.wanderChangeTimer -= dt;
              if (entity.wanderChangeTimer <= 0) {
          entity.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.5;
          entity.wanderChangeTimer = 500 + Math.random() * 1000; // Change direction every 0.5-1.5 seconds
              }
              
              // Calculate wander force
              const wanderStrength = 0.0003;
              const wanderX = Math.cos(entity.wanderAngle) * wanderStrength;
              const wanderY = Math.sin(entity.wanderAngle) * wanderStrength;
              
              // Combine with edge avoidance
              const edgeForce = 0.0004;
              Matter.Body.applyForce(entity.body, entity.body.position, {
          x: wanderX + edgeAvoidX * edgeForce,
          y: wanderY + edgeAvoidY * edgeForce
              });
              
              // Add some schooling behavior (reduced strength)
              let separationX = 0, separationY = 0;
              let neighborCount = 0;
              
              fishEntities.forEach(other => {
          if (other === entity) return;
          const odx = other.body.position.x - entity.body.position.x;
          const ody = other.body.position.y - entity.body.position.y;
          const odist = Math.sqrt(odx * odx + ody * ody);
          
          if (odist < 50 && odist > 0) {
            separationX -= odx / odist;
            separationY -= ody / odist;
            neighborCount++;
          }
              });
              
              if (neighborCount > 0) {
          const separationForce = 0.00004;
          Matter.Body.applyForce(entity.body, entity.body.position, {
            x: separationX * separationForce,
            y: separationY * separationForce
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
        
        // Clamp camera to world bounds (account for mobile zoom)
        const isMobile = window.innerHeight > window.innerWidth;
        const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;
        const halfW = (this.canvas.width / 2 / this.dpr) / zoomScale;
        const halfH = (this.canvas.height / 2 / this.dpr) / zoomScale;
        this.camera.x = Math.max(halfW, Math.min(this.worldWidth - halfW, this.camera.x));
        this.camera.y = Math.max(halfH, Math.min(this.worldHeight - halfH, this.camera.y));
      }

      drawWaterBlob(ctx, x, y, radius, velocity) {
        const time = performance.now() / 1000;
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        
        // Calculate deformation based on velocity
        const stretchFactor = Math.min(speed / 100, 0.4);
        const angle = Math.atan2(velocity.y, velocity.x);
        
        // Create blob shape with 17 control points
        const points = 17;
        const coords = [];
        
        for (let i = 0; i < points; i++) {
          const baseAngle = (i / points) * Math.PI * 2;
          
          // Random wobble that changes over time
          const wobbleFreq = 2 + i * 0.5;
          const wobbleAmt = 0.04 + Math.sin(time * 3 + i) * 0.03;
          const wobble = Math.sin(time * wobbleFreq + i * 2) * wobbleAmt;
          
          // Stretch in direction of movement
          let r = radius * (1 + wobble);
          const angleDiff = baseAngle - angle;
          const stretchInfluence = Math.cos(angleDiff);
          
          if (stretchInfluence > 0) {
            r *= (1 + stretchFactor * stretchInfluence);
          } else {
            r *= (1 - stretchFactor * 0.3 * Math.abs(stretchInfluence));
          }
          
          coords.push({
            x: x + Math.cos(baseAngle) * r,
            y: y + Math.sin(baseAngle) * r
          });
        }
        
        // Draw smooth blob using cardinal spline
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        
        for (let i = 0; i < points; i++) {
          const curr = coords[i];
          const next = coords[(i + 1) % points];
          const prev = coords[(i - 1 + points) % points];
          const next2 = coords[(i + 2) % points];
          
          const tension = 0.5;
          const cp1x = curr.x + (next.x - prev.x) / 6 * tension;
          const cp1y = curr.y + (next.y - prev.y) / 6 * tension;
          const cp2x = next.x - (next2.x - curr.x) / 6 * tension;
          const cp2y = next.y - (next2.y - curr.y) / 6 * tension;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
        }
        
        ctx.closePath();
        
        // Gradient fill
        const gradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
        gradient.addColorStop(0, '#e8f7ff');
        gradient.addColorStop(0.6, '#bfe7ff');
        gradient.addColorStop(1, '#8dd5ff');
        ctx.fillStyle = gradient;
        ctx.fill();
        
  // No outline: draw fill-only for the blob
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      render() {
        const ctx = this.ctx;
        const dpr = this.dpr;
        
        ctx.save();
        ctx.scale(dpr, dpr);
        
        // Clear
        ctx.fillStyle = '#fdfcfa';
        ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Apply mobile zoom if in portrait orientation
        const isMobile = window.innerHeight > window.innerWidth;
        const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;
        
        // Transform to world space with zoom
        ctx.translate(this.canvas.width / 2 / dpr, this.canvas.height / 2 / dpr);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-this.camera.x, -this.camera.y);
        
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
            ctx.beginPath();
            ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (entity.type === 'lilypad') {
            // Rotate the entire lilypad including notch based on body angle
            ctx.rotate(entity.body.angle);
            
            // Draw main lilypad
            ctx.fillStyle = '#d3e8c6';
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.2, entity.radius * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw notch
            ctx.fillStyle = '#fdfcfa';
            ctx.beginPath();
            ctx.moveTo(entity.radius * 0.7, 0);
            ctx.lineTo(entity.radius * 1.2, -5);
            ctx.lineTo(entity.radius * 1.2, 5);
            ctx.fill();
          } else if (entity.type === 'leaf') {
            ctx.fillStyle = '#cbecc7';
            ctx.rotate(entity.body.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (entity.type === 'fish') {
            const vx = entity.body.velocity.x;
            const flipX = vx < 0 ? -1 : 1;
            ctx.scale(flipX, 1);
            ctx.fillStyle = entity.color.fill;
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-entity.radius * 1.5, 0);
            ctx.lineTo(-entity.radius * 2.2, -entity.radius * 0.6);
            ctx.lineTo(-entity.radius * 2.2, entity.radius * 0.6);
            ctx.closePath();
            ctx.fill();
          }
          
          ctx.restore();
        });
        
        // Draw player with animated deformation
        this.drawWaterBlob(
          ctx,
          this.player.x,
          this.player.y,
          this.player.radius,
          this.player.body.velocity
        );
        
        // Draw ripples
        this.ripples.forEach(r => {
          const progress = r.age / r.life;
          const radius = r.maxRadius * progress;
          const alpha = 1 - progress;
          
          ctx.strokeStyle = `rgba(127, 191, 223, ${alpha * 0.5})`;
          ctx.lineWidth = 4 * (1 - progress);
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