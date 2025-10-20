<script>
  import { onMount } from 'svelte';

  // small helper: adjust hex color brightness by percent (-100..100)
  function shadeColor(hex, percent) {
    // strip #
    const h = hex.replace('#','');
    const num = parseInt(h,16);
    const r = (num >> 16) + Math.round(255 * (percent/100));
    const g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent/100));
    const b = (num & 0x0000FF) + Math.round(255 * (percent/100));
    const clamp = v => Math.max(0, Math.min(255, v));
    return '#'+((1<<24) + (clamp(r)<<16) + (clamp(g)<<8) + clamp(b)).toString(16).slice(1);
  }

  // Keep the classes and game code intact but run initialization in onMount
  // WebKit audio interface is declared in global.d.ts

  // Audio Manager
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.master = null;
      this.scale = [
        220.00, 246.94, 277.18, 329.63, 440.00, 493.88, 554.37, 659.26, 739.99,
        880.00, 987.77, 1108.73, 1318.51, 1479.98, 1760.00
      ]; // A major pentatonic (A3–A5)
      // Previous scale (A minor pentatonic):
      // this.scale = [220.00, 246.94, 261.63, 293.66, 329.63, 392.00,
      //   440.00, 493.88, 523.25, 587.33, 659.25, 784.00, 880.00, 1046.50];
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.9;
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

    // Play a short ascending five-note arpeggio for whirlpool
    async playWhirlpoolSound() {
      if (this.muted || !this.initialized) return;
      await this.resume();
      if (!this.ctx || this.ctx.state !== 'running') return;
      try {
        // choose a random start index but ensure we have space for 5 ascending notes
        const maxStart = Math.max(0, this.scale.length - 5);
        const start = Math.floor(Math.random() * (maxStart + 1));
        const now = this.ctx.currentTime;
        const spacing = 0.08;

        for (let i = 0; i < 5; i++) {
          const freq = this.scale[start + i];
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(this.master);
          const t0 = now + i * spacing;
          osc.start(t0);
          gain.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
          osc.stop(t0 + 0.3);
        }
      } catch (e) {
        console.error('Failed to play whirlpool sound:', e);
      }
    }

    async playCollisionSound() {
      if (this.muted || !this.initialized) return;
      await this.resume();
      if (!this.ctx || this.ctx.state !== 'running') return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 164.81;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        const now = this.ctx.currentTime;
        osc.start(now);
        gain.gain.value = 0.0001;
        gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
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

  // World is now a circle: 2000px diameter, radius 1000, centered at (1000,1000)
  this.worldDiameter = 2000;
  this.worldRadius = this.worldDiameter / 2;
  this.worldCenter = { x: this.worldRadius, y: this.worldRadius };

      this.mobileZoomFactor = 0.75;

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
  this.whirlpools = []; // active whirlpools
  this.lastTapTime = 0; // for double-tap detection
    // distance (in world pixels) from the player within which a double-tap/click
    // will trigger a whirlpool. Adjust this value to change how close the
    // interaction must be. (Assumption: 100px is a good default.)
    this.whirlpoolProximity = 100;
      this.entities = [];
      this.paused = false;
      this.audioManager = new AudioManager();
  // keyboard controls removed; rely on pointer/touch input only

      this.lastTime = performance.now();
      this.rippleTimer = 0;

  // offscreen watercolor canvas for the world interior
  this.watercolorCanvas = document.createElement('canvas');
  this.watercolorCtx = this.watercolorCanvas.getContext('2d');
  // offscreen texture canvas for the outside viridian background
  this.outsideTextureCanvas = document.createElement('canvas');
  this.outsideTextureCtx = this.outsideTextureCanvas.getContext('2d');
  // default palette (can be changed at runtime via setWatercolorPalette)
  this.watercolorPalette = ['#AAC6EE', '#6290C8', '#D9F7FA', '#C7CBE5', '#DADDE7'];

  // leaf image (optional). Place leaf.png in public/assets so it's available at /assets/leaf.png
  this.leafImage = new Image();
  this.leafImageLoaded = false;
  this.leafImage.onload = () => { this.leafImageLoaded = true; };
  this.leafImage.onerror = () => { this.leafImageLoaded = false; };
  // Use Vite's base URL so the app works when served from a subpath
  const _base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  this.leafImage.src = _base.replace(/\/$/, '') + '/assets/leaf.png';

  // dev helper: allow changing palette from the console, e.g.:
  // window.setWatercolorPalette(['#fff','...'])
  window.setWatercolorPalette = (pal) => this.setWatercolorPalette(pal);

      this.setupPhysics();
      this.setupCanvas();
      this.setupEntities();
      this.setupInput();
      this.setupUI();

      this.loop();
    }

    // Return true if the given world coordinates are within the proximity
    // threshold of the player. Keeps the double-tap/click logic concise.
    isNearPlayer(x, y) {
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= this.whirlpoolProximity;
    }

    setupPhysics() {
      const { Engine, Bodies, World } = Matter;
      this.engine = Engine.create();
      this.engine.gravity.y = 0;

      this.player.body = Bodies.circle(this.player.x, this.player.y, this.player.radius, {
        frictionAir: 0.08,
        restitution: 0.3,
        density: 0.002,
        label: 'player'
      });
      World.add(this.engine.world, this.player.body);

      this.boundaries = [];
      // Create a circular boundary by approximating the ring with many small static segments
      const wallThickness = 80;
      const segments = 64; // more segments = smoother circle
      const circumference = Math.PI * 2 * this.worldRadius;
      const segmentLength = circumference / segments;
      const cx = this.worldCenter.x;
      const cy = this.worldCenter.y;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const bx = cx + Math.cos(angle) * (this.worldRadius + wallThickness / 2);
        const by = cy + Math.sin(angle) * (this.worldRadius + wallThickness / 2);
        const seg = Bodies.rectangle(bx, by, segmentLength + 2, wallThickness, { isStatic: true, label: 'boundary' });
        Matter.Body.setAngle(seg, angle);
        World.add(this.engine.world, seg);
        this.boundaries.push(seg);
      }

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

        // size watercolor canvas to world bounds (in CSS pixels)
        this.watercolorCanvas.width = this.worldDiameter;
        this.watercolorCanvas.height = this.worldDiameter;
        this.generateWatercolor(this.watercolorCanvas, this.watercolorPalette);

        // small repeating texture for the outside (paper/noise)
        const texSize = 256;
        this.outsideTextureCanvas.width = texSize;
        this.outsideTextureCanvas.height = texSize;
        this.generateOutsideTexture(this.outsideTextureCanvas, '#6B9080');
      };
      resize();
      window.addEventListener('resize', resize);
    }

    // generate a subtle paper/noise texture for the outside background
    generateOutsideTexture(canvas, baseColor = '#6B9080') {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      // solid base
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);

      // faint blotches (darker and lighter) for organic variation
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 30 + Math.random() * 120;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        // alternate darker and lighter tints
        const dark = shadeColor(baseColor, -8 - Math.random() * 12);
        const light = shadeColor(baseColor, 6 + Math.random() * 10);
        grad.addColorStop(0, Math.random() > 0.5 ? dark : light);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.06 + Math.random() * 0.08;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // paper grain
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 8; // subtle stronger grain
        data[i] = Math.min(255, Math.max(0, data[i] + grain));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + grain));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + grain));
      }
      ctx.putImageData(imageData, 0, 0);

      // very subtle vignette to soften seams when tiling
      const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)/4, w/2, h/2, Math.max(w,h)/1.1);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.04)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // generate a watercolor texture on the provided canvas
    generateWatercolor(canvas, palette = ['#AAC6EE', '#6290C8', '#D9F7FA', '#C7CBE5', '#DADDE7']) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // start with a very light base so the watercolor stays bright
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.fillStyle = '#f7fdff'; // pale base (almost white with tiny blue tint)
      ctx.fillRect(0, 0, width, height);

  // use normal compositing so blotches remain visible against the pale base
  ctx.filter = 'blur(4px)';
  ctx.globalCompositeOperation = 'source-over';

      // draw many translucent radial blotches
      for (let i = 0; i < 140; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = 80 + Math.random() * 300;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        // keep the center solid and feather to transparent
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        // stronger alpha so the palette colors are visible
        ctx.globalAlpha = 0.12 + Math.random() * 0.28;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // subtle paper grain (weaker than before so it won't darken tones)
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 3; // reduced grain
        data[i] = Math.min(255, Math.max(0, data[i] + grain));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + grain));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + grain));
      }
      ctx.putImageData(imageData, 0, 0);

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    setWatercolorPalette(palette) {
      if (!Array.isArray(palette) || palette.length === 0) return;
      this.watercolorPalette = palette.slice();
      // regenerate immediately
      this.generateWatercolor(this.watercolorCanvas, this.watercolorPalette);
    }

    setupEntities() {
      const { Bodies, World } = Matter;

      for (let i = 0; i < 11; i++) {
        // place items randomly inside the circular world
        const r = (this.worldRadius - 120) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const x = this.worldCenter.x + Math.cos(a) * r;
        const y = this.worldCenter.y + Math.sin(a) * r;
        const radius = 10 + Math.random() * 15;
        const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'rock' });
        World.add(this.engine.world, body);
        this.entities.push({ type: 'rock', body, radius });
      }

      for (let i = 0; i < 9; i++) {
        const r = (this.worldRadius - 80) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const x = this.worldCenter.x + Math.cos(a) * r;
        const y = this.worldCenter.y + Math.sin(a) * r;
        const radius = 45;
        const angle = Math.random() * Math.PI * 2;
        const body = Bodies.circle(x, y, radius, {
          frictionAir: 0.03,
          restitution: 0.5,
          density: 0.001,
          label: 'lilypad',
          angle: angle
        });
        World.add(this.engine.world, body);
        this.entities.push({ type: 'lilypad', body, radius, angle });
      }

      for (let i = 0; i < 13; i++) {
        const r = (this.worldRadius - 120) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const x = this.worldCenter.x + Math.cos(a) * r;
        const y = this.worldCenter.y + Math.sin(a) * r;
        const radius = 20;
        const body = Bodies.circle(x, y, radius, {
          frictionAir: 0.01,
          restitution: 0.5,
          density: 0.0008,
          label: 'leaf'
        });
        World.add(this.engine.world, body);
        this.entities.push({
          type: 'leaf',
          body,
          radius,
          drift: { vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 }
        });
      }

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
        const r = (this.worldRadius - 160) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const x = this.worldCenter.x + Math.cos(a) * r;
        const y = this.worldCenter.y + Math.sin(a) * r;
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
      const tryResumeAudio = async () => {
        try {
          await this.audioManager.resume();
        } catch (err) {
          console.warn('Audio initialization failed, continuing without sound:', err);
        }
      };

      const getPointer = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const canvasX = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const canvasY = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

        const isMobile = window.innerHeight > window.innerWidth;
        const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;

        const worldX = this.camera.x + (canvasX - this.canvas.width / 2 / this.dpr) / zoomScale;
        const worldY = this.camera.y + (canvasY - this.canvas.height / 2 / this.dpr) / zoomScale;

        return { x: worldX, y: worldY };
      };

      const onDown = async (e) => {
        e.preventDefault();
        await tryResumeAudio();
        const pointer = getPointer(e);
        this.player.isDragging = true;
        this.player.inputTarget = pointer;
        this.createRipple(pointer.x, pointer.y);
        // double-tap detection (touch)
        if (e.touches) {
          const now = performance.now();
          if (now - this.lastTapTime < 350) {
            // only create a whirlpool if the double-tap is close to the player
            if (this.isNearPlayer(pointer.x, pointer.y)) {
              this.createWhirlpool(pointer.x, pointer.y);
            } else {
              // not near player: ignore whirlpool spawn (could add subtle feedback)
            }
            this.lastTapTime = 0;
          } else {
            this.lastTapTime = now;
          }
        }
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
      // desktop double-click
      this.canvas.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const canvasY = (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
        const isMobile = window.innerHeight > window.innerWidth;
        const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;
        const worldX = this.camera.x + (canvasX - this.canvas.width / 2 / this.dpr) / zoomScale;
        const worldY = this.camera.y + (canvasY - this.canvas.height / 2 / this.dpr) / zoomScale;
        if (this.isNearPlayer(worldX, worldY)) {
          this.createWhirlpool(worldX, worldY);
        } else {
          // ignore double-clicks far from the player; keep interaction focused
        }
      });
      this.canvas.addEventListener('touchmove', onMove);
      this.canvas.addEventListener('touchend', onUp);
      // Keyboard event listeners removed — game uses pointer/touch controls only.
    }

    setupUI() {
      const tryResumeAudio = async () => {
        try {
          await this.audioManager.resume();
        } catch (err) {
          console.warn('Audio initialization failed, continuing without sound:', err);
        }
      };

      document.getElementById('pauseBtn').addEventListener('click', async () => {
        await tryResumeAudio();
        this.paused = !this.paused;
        document.getElementById('pauseBtn').textContent = this.paused ? '▶' : '⏸';
      });

      document.getElementById('muteBtn').addEventListener('click', async () => {
        await tryResumeAudio();
        this.audioManager.setMuted(!this.audioManager.muted);
        document.getElementById('muteBtn').textContent = this.audioManager.muted ? '🔇' : '🔊';
      });
    }

    createRipple(x, y) {
      const maxRadius = 220 + Math.random() * 60;
      this.ripples.push({ x, y, age: 0, life: 900, maxRadius });
      const noteIndex = Math.floor(Math.random() * 15);
      this.audioManager.playXylophoneNote(noteIndex);
    }

    createWhirlpool(x, y) {
      // small whirlpool: short life and radius
      const life = 900; // ms
      const maxRadius = 180 + Math.random() * 60;
      const spin = 1.2 + Math.random() * 1.8; // visual spin speed
      this.whirlpools.push({ x, y, age: 0, life, maxRadius, spin });
      // play ascending arpeggio
      this.audioManager.playWhirlpoolSound();
    }

    update(dt) {
      if (this.paused) return;

      const dtSec = dt / 1000;
      Matter.Engine.update(this.engine, dt);

      if (this.player.inputTarget) {
        const dx = this.player.inputTarget.x - this.player.body.position.x;
        const dy = this.player.inputTarget.y - this.player.body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          const force = 0.0015;
          Matter.Body.applyForce(this.player.body, this.player.body.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force
          });
        }
      }

      // Keyboard controls removed — input handled via pointer/touch only

      this.player.x = this.player.body.position.x;
      this.player.y = this.player.body.position.y;

      this.rippleTimer += dt;
      const speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
      if (speed > 0.5 && this.rippleTimer > 250) {
        this.createRipple(this.player.x, this.player.y);
        this.rippleTimer = 0;
      }

      this.ripples = this.ripples.filter(r => {
        r.age += dt;
        return r.age < r.life;
      });

      // update whirlpools and apply forces to movable entities
      this.whirlpools = this.whirlpools.filter(w => {
        w.age += dt;
        const progress = w.age / w.life;
        const radius = w.maxRadius * progress;

        // apply outward radial + tangential spin force to fish, leaves, lilypads
        this.entities.forEach(entity => {
          if (!['fish','leaf','lilypad'].includes(entity.type)) return;
          const ex = entity.body.position.x - w.x;
          const ey = entity.body.position.y - w.y;
          const dist = Math.sqrt(ex*ex + ey*ey) || 0.0001;
          if (dist > w.maxRadius) return;

          // normalized direction
          const nx = ex / dist;
          const ny = ey / dist;

          // outward push scaled by proximity (stronger near center)
          const pushStrength = 0.0022 * (1 - (dist / w.maxRadius)) * (1 - progress);
          Matter.Body.applyForce(entity.body, entity.body.position, {
            x: nx * pushStrength,
            y: ny * pushStrength
          });

          // tangential spin (clockwise): perpendicular to radial (ny, -nx)
          const tangential = w.spin * 0.0012 * (1 - (dist / w.maxRadius)) * (1 - progress);
          Matter.Body.applyForce(entity.body, entity.body.position, {
            x: ny * tangential,
            y: -nx * tangential
          });
        });

        return w.age < w.life;
      });

      const fishEntities = this.entities.filter(e => e.type === 'fish');

      this.entities.forEach(entity => {
        if (entity.type === 'fish') {
          const dx = this.player.x - entity.body.position.x;
          const dy = this.player.y - entity.body.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const edgeBuffer = 100;
          const cx = this.worldCenter.x;
          const cy = this.worldCenter.y;
          const ex = entity.body.position.x - cx;
          const ey = entity.body.position.y - cy;
          const distFromCenter = Math.sqrt(ex * ex + ey * ey) || 0.0001;
          const distToBoundary = this.worldRadius - distFromCenter;

          let edgeAvoidX = 0;
          let edgeAvoidY = 0;

          if (distToBoundary < edgeBuffer) {
            // push back toward center (inward)
            edgeAvoidX = -ex / distFromCenter;
            edgeAvoidY = -ey / distFromCenter;
          }

          if (dist < entity.fearRadius) {
            const fleeForce = 0.0006;
            const nx = -dx / dist;
            const ny = -dy / dist;
            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: nx * fleeForce,
              y: ny * fleeForce
            });
            entity.fleeTimer = 2000;
          } else if (entity.fleeTimer <= 0) {
            if (entity.wanderAngle === undefined) {
              entity.wanderAngle = Math.random() * Math.PI * 2;
              entity.wanderChangeTimer = 0;
            }

            // wander angle changes occasionally
            entity.wanderChangeTimer -= dt;
            if (entity.wanderChangeTimer <= 0) {
              entity.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.6;
              entity.wanderChangeTimer = 600 + Math.random() * 1400;
            }

            // continuous base swim force in the wander direction
            const baseSpeed = entity.baseSpeed || 0.0003;
            // occasional zoom behavior
            entity.zoomTimer -= dt;
            if (!entity.isZooming && entity.zoomTimer <= 0) {
              // start a zoom
              entity.isZooming = true;
              entity.zoomDuration = 200 + Math.random() * 300;
              entity.zoomMultiplier = 1.1 + Math.random() * 1.1;
            }
            if (entity.isZooming) {
              entity.zoomDuration -= dt;
              if (entity.zoomDuration <= 0) {
                entity.isZooming = false;
                entity.zoomTimer = 1500 + Math.random() * 6000;
                entity.zoomMultiplier = 1;
              }
            }

            const currentSpeed = baseSpeed * (entity.isZooming ? entity.zoomMultiplier : 1);
            const wanderX = Math.cos(entity.wanderAngle) * currentSpeed;
            const wanderY = Math.sin(entity.wanderAngle) * currentSpeed;

            // stronger inward bias as fish approach boundary, scaled by distToBoundary
            const edgeForce = 0.0006;
            const inwardStrength = Math.max(0, (edgeBuffer - distToBoundary) / edgeBuffer);
            const inwardX = edgeAvoidX * edgeForce * (0.5 + inwardStrength * 1.5) * (entity.inwardBias || 1);
            const inwardY = edgeAvoidY * edgeForce * (0.5 + inwardStrength * 1.5) * (entity.inwardBias || 1);

            // schooling: cohesion + alignment
            let cohesionX = 0, cohesionY = 0;
            let alignX = 0, alignY = 0;
            let neighborCount = 0;

            fishEntities.forEach(other => {
              if (other === entity) return;
              const odx = other.body.position.x - entity.body.position.x;
              const ody = other.body.position.y - entity.body.position.y;
              const odist = Math.sqrt(odx * odx + ody * ody) || 0.0001;

              if (odist < 140) {
                // cohesion: steer toward average position of neighbors
                cohesionX += other.body.position.x;
                cohesionY += other.body.position.y;
                // alignment: match neighbor velocity direction
                alignX += other.body.velocity.x;
                alignY += other.body.velocity.y;
                neighborCount++;
              }

              // separation (avoid collisions)
              if (odist < 40 && odist > 0) {
                const separationForce = 0.00012;
                Matter.Body.applyForce(entity.body, entity.body.position, {
                  x: -odx / odist * separationForce,
                  y: -ody / odist * separationForce
                });
              }
            });

            if (neighborCount > 0) {
              const inv = 1 / neighborCount;
              cohesionX = (cohesionX * inv - entity.body.position.x) * 0.00018; // pull toward center of neighbors
              cohesionY = (cohesionY * inv - entity.body.position.y) * 0.00018;
              alignX = (alignX * inv) * 0.00008;
              alignY = (alignY * inv) * 0.00008;
            }

            // combine forces: wander + inward + cohesion + alignment
            const fx = wanderX + inwardX + cohesionX + alignX;
            const fy = wanderY + inwardY + cohesionY + alignY;

            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: fx,
              y: fy
            });
          } else {
            entity.fleeTimer -= dt;
          }
        } else if (entity.type === 'leaf' && entity.drift) {
          const driftForce = 0.00005;
          Matter.Body.applyForce(entity.body, entity.body.position, {
            x: entity.drift.vx * driftForce,
            y: entity.drift.vy * driftForce
          });
        }
      });

      const targetCameraX = this.player.x;
      const targetCameraY = this.player.y;
      this.camera.x += (targetCameraX - this.camera.x) * 0.12;
      this.camera.y += (targetCameraY - this.camera.y) * 0.12;

      const isMobile = window.innerHeight > window.innerWidth;
      const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;
      // Camera is free to view outside the world (no clamping)
    }

    drawWaterBlob(ctx, x, y, radius, velocity) {
      const time = performance.now() / 1000;
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

      const stretchFactor = Math.min(speed / 100, 0.4);
      const angle = Math.atan2(velocity.y, velocity.x);

      const points = 17;
      const coords = [];

      for (let i = 0; i < points; i++) {
        const baseAngle = (i / points) * Math.PI * 2;
        const wobbleFreq = 2 + i * 0.5;
        const wobbleAmt = 0.04 + Math.sin(time * 3 + i) * 0.03;
        const wobble = Math.sin(time * wobbleFreq + i * 2) * wobbleAmt;

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

      const gradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
      gradient.addColorStop(0, '#e8f7ff');
      gradient.addColorStop(0.6, '#bfe7ff');
      gradient.addColorStop(1, '#8dd5ff');
      ctx.fillStyle = gradient;
      ctx.fill();

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

      // draw outside-world background (viridian) with subtle paper texture
      if (this.outsideTextureCanvas) {
        const pattern = ctx.createPattern(this.outsideTextureCanvas, 'repeat');
        ctx.fillStyle = pattern;
      } else {
        ctx.fillStyle = '#6B9080';
      }
  ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

      const isMobile = window.innerHeight > window.innerWidth;
      const zoomScale = isMobile ? this.mobileZoomFactor : 1.0;

      ctx.translate(this.canvas.width / 2 / dpr, this.canvas.height / 2 / dpr);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-this.camera.x, -this.camera.y);

  // draw the world interior as a filled light circle with a hard edge
  // draw watercolor texture clipped to the world circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.worldCenter.x, this.worldCenter.y, this.worldRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // draw watercolor image (the offscreen canvas is in CSS pixels for the world)
  // we need to draw it at the world origin (worldCenter - radius)
  const worldDrawX = this.worldCenter.x - this.worldRadius;
  const worldDrawY = this.worldCenter.y - this.worldRadius;
  ctx.drawImage(this.watercolorCanvas, worldDrawX, worldDrawY, this.worldDiameter, this.worldDiameter);

  ctx.restore();

  // draw hard edge on top
  ctx.beginPath();
  ctx.arc(this.worldCenter.x, this.worldCenter.y, this.worldRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fill();
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 3;
  ctx.stroke();

      this.entities.forEach(entity => {
        const pos = entity.body.position;
        const time = performance.now() / 1000;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
        ctx.scale(breathScale, breathScale);

        if (entity.type === 'rock') {
          ctx.fillStyle = '#e9e5df';
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (entity.type === 'lilypad') {
          ctx.rotate(entity.body.angle);
          ctx.fillStyle = '#d3e8c6';
          ctx.beginPath();
          ctx.ellipse(0, 0, entity.radius * 1.2, entity.radius * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fdfcfa';
          ctx.beginPath();
          ctx.moveTo(entity.radius * 0.7, 0);
          ctx.lineTo(entity.radius * 1.2, -5);
          ctx.lineTo(entity.radius * 1.2, 5);
          ctx.fill();
        } else if (entity.type === 'leaf') {
          // If a leaf image is available, draw it centered and rotated to match the body.
          if (this.leafImageLoaded && this.leafImage && this.leafImage.naturalWidth) {
            const iw = this.leafImage.naturalWidth;
            const ih = this.leafImage.naturalHeight;
            // scale image so its longer side roughly matches entity.radius * 2.5
            const targetSize = entity.radius * 2.5;
            const scale = targetSize / Math.max(iw, ih);
            ctx.rotate(entity.body.angle);
            ctx.drawImage(this.leafImage, -iw * 0.5 * scale, -ih * 0.5 * scale, iw * scale, ih * scale);
          } else {
            // fallback: original stylized ellipse
            ctx.fillStyle = '#cbecc7';
            ctx.rotate(entity.body.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (entity.type === 'fish') {
          const vx = entity.body.velocity.x;
          const flipX = vx < 0 ? -1 : 1;
          ctx.scale(flipX, 1);
          ctx.fillStyle = entity.color.fill;
          ctx.beginPath();
          ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-entity.radius * 1.5, 0);
          ctx.lineTo(-entity.radius * 2.2, -entity.radius * 0.6);
          ctx.lineTo(-entity.radius * 2.2, entity.radius * 0.6);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      this.drawWaterBlob(
        ctx,
        this.player.x,
        this.player.y,
        this.player.radius,
        this.player.body.velocity
      );

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

      // whirlpool visuals: spinning clockwise rings
      this.whirlpools.forEach(w => {
        const progress = w.age / w.life;
        const alpha = 1 - progress;
        const baseRadius = w.maxRadius * progress;
        const rings = 3;
        const time = performance.now() / 1000;

        for (let i = 0; i < rings; i++) {
          const rProgress = (i + 1) / rings;
          const radius = baseRadius * rProgress * (0.6 + 0.4 * Math.sin(time * 2 + i));
          const spinAngle = time * w.spin * (0.8 + i * 0.3);
          ctx.save();
          ctx.translate(w.x, w.y);
          ctx.rotate(spinAngle);
          ctx.strokeStyle = `rgba(110,160,200, ${alpha * (0.6 - i*0.15)})`;
          ctx.lineWidth = 3 * (1 - progress) * (1 + i * 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, radius, Math.PI * 0.2, Math.PI * 1.8);
          ctx.stroke();
          ctx.restore();
        }

        // small inner swirl lines
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(time * w.spin * 1.4);
        ctx.strokeStyle = `rgba(200,230,245, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        for (let a = 0; a < 5; a++) {
          const angle = a * Math.PI * 0.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * baseRadius * 0.15, Math.sin(angle) * baseRadius * 0.15);
          ctx.quadraticCurveTo(0, 0, Math.cos(angle + 0.6) * baseRadius * 0.5, Math.sin(angle + 0.6) * baseRadius * 0.5);
          ctx.stroke();
        }
        ctx.restore();
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

  onMount(() => {
    // Start the game once the component is mounted and DOM elements are available
    new LittledropGame();
  });
</script>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    overflow: hidden;
    background: #fdfcfa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    touch-action: none;
  }

  /* Make sure the app root fills the viewport and isn't shifted by
     `src/app.css` (which centers #app). This guarantees the canvas
     occupies the full window on GitHub Pages and other hosts. */
  :global(html, body, #app) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }

  /* Force the app container to cover the full viewport so flex/layout
     rules from other stylesheets can't add centering offsets. */
  :global(#app) {
    position: fixed;
    inset: 0; /* top:0; right:0; bottom:0; left:0; */
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

  .ui-button:hover { transform: scale(1.05); }
  .ui-button:active { transform: scale(0.95); }

  #pauseBtn { left: 20px; }
  #muteBtn { right: 20px; }
</style>

<canvas id="gameCanvas"></canvas>
<button id="pauseBtn" class="ui-button">⏸</button>
<button id="muteBtn" class="ui-button">🔊</button>