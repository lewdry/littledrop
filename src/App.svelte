<script>
  import { onMount } from 'svelte';

  let _isLocalDev = null;
  function isLocalDevHost() {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    if (_isLocalDev === null) {
      const host = window.location.hostname;
      _isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    }
    return _isLocalDev;
  }

  function logDevError(message, error) {
    if (isLocalDevHost()) {
      console.error(message, error);
    }
  }

  // app-level state for splash/start
  let game = null;
  let showSplash = true;

  async function startGame() {
    showSplash = false;
    if (game) {
      // try to synchronously unlock audio during this user gesture (do not await)
      try {
        game.audioManager.unlockOnGesture();
      } catch (e) {
        logDevError('Audio unlock during start failed', e);
      }

      // animate camera zoom into gameplay over 2s, then unpause and play a note
      try {
        await game.zoomToGameplay(2000);
      } catch (e) {
        // if animation fails, continue to unpause
        console.warn('zoomToGameplay failed:', e);
      }

      // attempt to play a small note (non-blocking)
      try {
        game.audioManager.playXylophoneNote(Math.floor(Math.random() * 15));
      } catch (e) {
        logDevError('Failed to trigger start note', e);
      }
      game.paused = false;
    }
  }

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
      this.initialized = false;
      this._resumePromise = null;
      this._resumeFailed = false;
      this._unlockAttempts = 0;
      this._maxUnlockAttempts = 3;
      this._unlockBlocked = false;
      this._unlockInFlight = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          throw new Error('Web Audio API not supported');
        }
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.9;
        this.initialized = true;
        this._resumeFailed = false;
        this._unlockAttempts = 0;
        this._unlockBlocked = false;
      } catch (e) {
        console.error('Failed to initialize audio context:', e);
        this.initialized = false;
        this._resumeFailed = true;
        this._unlockBlocked = true;
      }
    }

    // Try to synchronously unlock audio during a user gesture.
    // This should be called directly from a touch/click handler (do not await).
    unlockOnGesture() {
      if (this._unlockBlocked) {
        return this.initialized && this.ctx && this.ctx.state === 'running';
      }
      try {
        if (!this.initialized) this.init();
        if (!this.ctx) {
          this._unlockBlocked = true;
          return false;
        }
        if (this._unlockInFlight) {
          return this.ctx.state === 'running';
        }
        if (this.ctx.state === 'running') {
          this.initialized = true;
          this._unlockAttempts = 0;
          return true;
        }
        this._unlockInFlight = true;
        // Try a fast resume call. The call itself is synchronous and helps browsers
        // that accept resume() within a user activation.
        try {
          if (this.ctx && typeof this.ctx.resume === 'function') {
            this.ctx.resume(); // do not await here
          }
        } catch (e) {
          console.warn('AudioContext.resume (sync) failed:', e);
        }

        if (this.ctx && this.ctx.state === 'running') {
          this.initialized = true;
          this._unlockAttempts = 0;
          return true;
        }

        // Fallback for older Safari: create a tiny oscillator and start/stop it immediately
        if (this.ctx) {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.00001, now); // extremely low volume to avoid clicks

          // Ensure master exists and is connected
          if (!this.master) {
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            this.master.gain.value = 0.6;
          }

          osc.connect(g);
          g.connect(this.master);
          osc.start(now);
          const stopAt = now + 0.01; // 10ms pulse
          osc.stop(stopAt);
          const cleanup = () => {
            try {
              osc.disconnect();
            } catch (err) {
              logDevError('Oscillator disconnect failed', err);
            }
            try {
              g.disconnect();
            } catch (err) {
              logDevError('Gain disconnect failed', err);
            }
          };
          osc.onended = cleanup;
          // Safety cleanup in case onended doesn't fire (older browsers)
          setTimeout(cleanup, 30);

          if (this.ctx.state === 'running') {
            this.initialized = true;
            this._unlockAttempts = 0;
            return true;
          }

          console.debug('AudioManager: unlockOnGesture attempted oscillator fallback');
        }
      } catch (err) {
        console.warn('unlockOnGesture failed:', err);
      } finally {
        this._unlockInFlight = false;
        if (!this.initialized) {
          this._unlockAttempts += 1;
          if (this._unlockAttempts >= this._maxUnlockAttempts) {
            this._unlockBlocked = true;
          }
        }
      }
      return false;
    }

    async resume() {
      if (this._resumeFailed) return false;
      if (!this.initialized) this.init();
      if (!this.ctx) return false;
      if (this.ctx.state === 'running') return true;
      if (this._resumePromise) return this._resumePromise;

      this._resumePromise = (async () => {
        try {
          if (typeof this.ctx.resume === 'function') {
            await this.ctx.resume();
          }
          const running = this.ctx.state === 'running';
          if (running) {
            this.initialized = true;
            this._resumeFailed = false;
          }
          return running;
        } catch (e) {
          console.error('Failed to resume audio context:', e);
          this._resumeFailed = true;
          return false;
        } finally {
          this._resumePromise = null;
        }
      })();

      return this._resumePromise;
    }

    async playXylophoneNote(index = 0, duration = 0.35) {
      if (this.muted) return;
      const resumed = await this.resume();
      if (!resumed || !this.ctx || this.ctx.state !== 'running') return;
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

    async playWhirlpoolSound() {
      if (this.muted) return;
      const resumed = await this.resume();
      if (!resumed || !this.ctx || this.ctx.state !== 'running') return;
      try {
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
      if (this.muted) return;
      const resumed = await this.resume();
      if (!resumed || !this.ctx || this.ctx.state !== 'running') return;
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

      // Constants for game physics and behavior
      this.FISH_FLEE_FORCE = 0.0006;
      this.FISH_BASE_SPEED = 0.0003;
      this.FISH_EDGE_FORCE = 0.0006;
      this.FISH_SEPARATION_FORCE = 0.00012;
      this.FISH_COHESION_FORCE = 0.00018;
      this.FISH_ALIGNMENT_FORCE = 0.00008;
      this.FISH_NEIGHBOR_DISTANCE = 140;
      this.FISH_SEPARATION_DISTANCE = 40;
  // additional padding added to separation distance when fish are idle
      this.FISH_MIN_PADDING = 20;
      this.LEAF_DRIFT_FORCE = 0.00005;
      this.PLAYER_MOVE_FORCE = 0.0015;

  // Threshold and cooldown used to stabilize fish facing updates near rest
  this.FISH_FACING_THRESHOLD = 0.06;
  this.FISH_FACING_COOLDOWN = 220;

  this.camera = { x: 1000, y: 1000, zoom: 1 };
      this.player = {
        x: 1000,
        y: 1000,
        vx: 0,
        vy: 0,
        radius: 18,
        isDragging: false,
        inputTarget: null,
        body: null
      };

      this.ripples = [];
      this.whirlpools = [];
      this.lastTapTime = 0;
      this.whirlpoolProximity = 400;
      this.entities = [];
  // shared leaf drift (single gust vector applied to all leaves)
  this.sharedLeafDrift = { vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 };
  this.sharedLeafDriftTimer = 2000 + Math.random() * 4000;
      this.paused = false;
      this.audioManager = new AudioManager();

      // water blob rendering optimization: fewer points and precomputed base angles
      this._blobPoints = 9; // reduced from 17
      this._blobBaseCos = new Array(this._blobPoints);
      this._blobBaseSin = new Array(this._blobPoints);
      for (let i = 0; i < this._blobPoints; i++) {
        const a = (i / this._blobPoints) * Math.PI * 2;
        this._blobBaseCos[i] = Math.cos(a);
        this._blobBaseSin[i] = Math.sin(a);
      }
      // preallocate blob coord objects to avoid per-frame allocations
      const _coordsInit = new Array(this._blobPoints);
      for (let i = 0; i < this._blobPoints; i++) _coordsInit[i] = { x: 0, y: 0 };
      this._waterBlobCache = { lastT: 0, coords: _coordsInit };

      this.lastTime = performance.now();
      this.rippleTimer = 0;
  // fixed physics timestep (ms) and accumulator to reduce physics CPU
  this._physicsStepMs = 1000 / 30; // 30 Hz physics
  this._physicsAccumulator = 0;
  // debug flag: set to true to log large separation forces / overlaps
  this.DEBUG_FISH_SEPARATION = false;

      this._outsideTextureColor = '#6B9080';
      this._rockTextureColor = '#424342';
      this._pendingOutsideTextureSize = 256;
      this._pendingRockTextureSize = 128;
      this._needsOutsideTextureRefresh = true;
      this._needsRockTextureRefresh = true;

      // offscreen watercolor canvas for the world interior
      this.watercolorCanvas = document.createElement('canvas');
      this.watercolorCtx = this.watercolorCanvas.getContext('2d');
      // offscreen texture canvas for the outside viridian background
      this.outsideTextureCanvas = document.createElement('canvas');
      this.outsideTextureCtx = this.outsideTextureCanvas.getContext('2d');
  // offscreen canvas for rock texture
  this.rockTextureCanvas = document.createElement('canvas');
  this.rockTextureCtx = this.rockTextureCanvas.getContext('2d');
    this._fishTextureConfig = { radius: 16, size: Math.ceil(16 * 3), poolSize: 12 };
    this.fishTexturePool = Array.from({ length: this._fishTextureConfig.poolSize }, () => null);
    this._fishPatternColorCache = {};
      // default palette
      this.watercolorPalette = ['#AAC6EE', '#6290C8', '#D9F7FA', '#C7CBE5', '#DADDE7'];

  // typed entity lists to avoid per-frame filtering
  this.fishEntities = [];
  this.leafEntities = [];
  this.rockEntities = [];
  this.lilypadEntities = [];

  // cached canvas patterns (created on resize/setup)
  this.outsidePattern = null;
  this.rockPattern = null;
  this.grassPattern = null;

  // simple spatial hash used for neighbor queries (built each update)
  this._spatialHash = null;
  this._cellSize = null;

      // leaf image
      this.leafImage = new Image();
      this.leafImageLoaded = false;
      this.leafImage.onload = () => { this.leafImageLoaded = true; };
      this.leafImage.onerror = () => { this.leafImageLoaded = false; };
      const _base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
      this.leafImage.src = _base.replace(/\/$/, '') + '/assets/leaf.png';

  // rock image (prefer PNG over procedural texture)
  this.rockImage = new Image();
  this.rockImageLoaded = false;
  this.rockImage.onload = () => { this.rockImageLoaded = true; };
  this.rockImage.onerror = () => { this.rockImageLoaded = false; };
  this.rockImage.src = _base.replace(/\/$/, '') + '/assets/rock.png';

  // lilypad image
  this.lilypadImage = new Image();
  this.lilypadImageLoaded = false;
  this.lilypadImage.onload = () => { this.lilypadImageLoaded = true; };
  this.lilypadImage.onerror = () => { this.lilypadImageLoaded = false; };
  this.lilypadImage.src = _base.replace(/\/$/, '') + '/assets/lilypad.png';

    // grass tile image for outside area (preferred repeatable background)
    this.grassImage = new Image();
    this.grassImageLoaded = false;
    this.grassImage.onload = () => { 
        this.grassImageLoaded = true;
        try {
          // try to create grass pattern immediately (ctx exists)
          if (this.ctx) this.grassPattern = this.ctx.createPattern(this.grassImage, 'repeat');
        } catch (e) {
          this.grassPattern = null;
        }
      };
    this.grassImage.onerror = () => { this.grassImageLoaded = false; };
    this.grassImage.src = _base.replace(/\/$/, '') + '/assets/grass.png';

      window.setWatercolorPalette = (pal) => this.setWatercolorPalette(pal);

      this.setupPhysics();
      this.setupCanvas();
      this.setupEntities();
      this.setupInput();
      this.setupUI();

      this.loop();
    }

    isNearPlayer(x, y) {
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      const dist2 = dx * dx + dy * dy;
      return dist2 <= this.whirlpoolProximity * this.whirlpoolProximity;
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
      const wallThickness = 80;
      const segments = 64;
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

        this.watercolorCanvas.width = this.worldDiameter;
        this.watercolorCanvas.height = this.worldDiameter;
        this.generateWatercolor(this.watercolorCanvas, this.watercolorPalette);

        const texSize = 256;
        this._pendingOutsideTextureSize = texSize;
        this._needsOutsideTextureRefresh = true;
        this.outsidePattern = null;

        // rock texture: keep reasonably small and repeatable
        const rockTexSize = 128;
        this._pendingRockTextureSize = rockTexSize;
        this._needsRockTextureRefresh = true;
        this.rockPattern = null;

        // compute a zoom which fits the entire world inside the canvas initially
        // worldDiameter is in world space; canvas size in CSS pixels is (canvas.width / dpr)
        const screenW = this.canvas.width / this.dpr;
        const screenH = this.canvas.height / this.dpr;
        const fitZoom = Math.min(screenW / this.worldDiameter, screenH / this.worldDiameter) * 0.95;
        // keep a sensible minimum/maximum
        this.worldFitZoom = Math.max(0.05, Math.min(2, fitZoom));

        // store the target gameplay zoom (what we zoom to when starting the game)
        const isMobile = window.innerHeight > window.innerWidth;
        this.targetGameplayZoom = isMobile ? this.mobileZoomFactor : 1.0;

        // initialize camera zoom to the fit zoom so the whole world is visible on load
        this.camera.zoom = this.worldFitZoom;
      };
      resize();
      window.addEventListener('resize', resize);
    }

    generateOutsideTexture(canvas, baseColor = '#6B9080') {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 30; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 30 + Math.random() * 120;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
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

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 8;
        data[i] = Math.min(255, Math.max(0, data[i] + grain));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + grain));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + grain));
      }
      ctx.putImageData(imageData, 0, 0);

      const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)/4, w/2, h/2, Math.max(w,h)/1.1);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.04)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    generateWatercolor(canvas, palette = ['#AAC6EE', '#6290C8', '#D9F7FA']) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.fillStyle = '#ddeded';
      ctx.fillRect(0, 0, width, height);

      ctx.filter = 'blur(4px)';
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < 140; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = 80 + Math.random() * 300;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.globalAlpha = 0.12 + Math.random() * 0.28;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 3;
        data[i] = Math.min(255, Math.max(0, data[i] + grain));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + grain));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + grain));
      }
      ctx.putImageData(imageData, 0, 0);

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    generateRockTexture(canvas, baseColor = '#424342') {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      // base fill
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, w, h);

      // soft blotches (lighter/darker)
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 8 + Math.random() * (w * 0.3);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = shadeColor(baseColor, -8 - Math.random() * 10);
        const light = shadeColor(baseColor, 6 + Math.random() * 12);
        grad.addColorStop(0, Math.random() > 0.5 ? light : dark);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.06 + Math.random() * 0.18;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // fine grain
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 18;
        data[i] = Math.min(255, Math.max(0, data[i] + grain));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + grain * 0.6));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + grain * 0.4));
      }
      ctx.putImageData(imageData, 0, 0);

      // subtle veins/cracks
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = shadeColor(baseColor, -18);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.moveTo(sx, sy);
        for (let j = 0; j < 4; j++) {
          const nx = sx + (Math.random() - 0.5) * w * 0.6 * (j/3 + 0.2);
          const ny = sy + (Math.random() - 0.5) * h * 0.6 * (j/3 + 0.2);
          ctx.lineTo(nx, ny);
        }
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.stroke();
      }

      // slight highlight spot
      ctx.globalAlpha = 0.12;
      const hx = w * (0.2 + Math.random() * 0.6);
      const hy = h * (0.2 + Math.random() * 0.6);
      const hr = Math.min(w,h) * (0.22 + Math.random() * 0.18);
      const hgrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hgrad.addColorStop(0, 'rgba(255,255,255,0.8)');
      hgrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hgrad;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    refreshTexturesIfNeeded(ctx) {
      if (!ctx) return;

      if (this._needsOutsideTextureRefresh) {
        const size = this._pendingOutsideTextureSize || 256;
        this.outsideTextureCanvas.width = size;
        this.outsideTextureCanvas.height = size;
        try {
          this.generateOutsideTexture(this.outsideTextureCanvas, this._outsideTextureColor);
          this.outsidePattern = ctx.createPattern(this.outsideTextureCanvas, 'repeat');
        } catch (e) {
          this.outsidePattern = null;
          logDevError('Failed to refresh outside texture', e);
        }
        this._needsOutsideTextureRefresh = false;
      }

      if (this._needsRockTextureRefresh) {
        const size = this._pendingRockTextureSize || 128;
        this.rockTextureCanvas.width = size;
        this.rockTextureCanvas.height = size;
        try {
          this.generateRockTexture(this.rockTextureCanvas, this._rockTextureColor);
          this.rockPattern = ctx.createPattern(this.rockTextureCanvas, 'repeat');
        } catch (e) {
          this.rockPattern = null;
          logDevError('Failed to refresh rock texture', e);
        }
        this._needsRockTextureRefresh = false;
      }
    }

    // generate a small offscreen texture for fish that contains ONLY the
    // pattern (transparent background). The base fill will be drawn when
    // rendering each fish so patterns can be mixed with any colour.
    generateFishTexture(canvas, /*fill*/ _fill = null, stroke = '#000000') {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      // keep the canvas transparent
      ctx.clearRect(0, 0, w, h);

      // pick pattern: curved stripes, horizontal stripes, vertical stripes, or dots
      const patterns = ['stripes', 'hstripes', 'vstripes', 'dots'];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      if (pattern === 'stripes') {
        // thinner stripes, less fill coverage
        const stripeCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < stripeCount; i++) {
          ctx.fillStyle = shadeColor(stroke, -8 + Math.random() * 14);
          // reduce stripe height and add stronger horizontal jitter
          const y = (i / stripeCount) * h - h * 0.12 + (Math.random() - 0.5) * h * 0.14;
          const stripeW = w * (0.45 + Math.random() * 0.2);
          const stripeH = h * (0.12 + Math.random() * 0.08);
          ctx.beginPath();
          ctx.ellipse(w/2 + (Math.random() - 0.5) * w * 0.04, y + h*0.12, stripeW, stripeH, Math.PI * (Math.random() * 0.12 - 0.06), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pattern === 'hstripes') {
        // thin horizontal stripes
        const stripeCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < stripeCount; i++) {
          ctx.fillStyle = shadeColor(stroke, -6 + Math.random() * 12);
          const y = (i + 0.5) / stripeCount * h + (Math.random() - 0.5) * h * 0.06;
          const stripeH = h * (0.07 + Math.random() * 0.04);
          ctx.beginPath();
          ctx.ellipse(w/2, y, w * 0.5, stripeH, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pattern === 'vstripes') {
        // thin vertical stripes
        const stripeCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < stripeCount; i++) {
          ctx.fillStyle = shadeColor(stroke, -6 + Math.random() * 12);
          const x = (i + 0.5) / stripeCount * w + (Math.random() - 0.5) * w * 0.06;
          const stripeW = w * (0.07 + Math.random() * 0.04);
          ctx.save();
          ctx.translate(x, h/2);
          ctx.beginPath();
          ctx.ellipse(0, 0, stripeW, h * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        // dots: smaller, more sparse
        const dotCount = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < dotCount; i++) {
          ctx.fillStyle = shadeColor(stroke, -6 + Math.random() * 12);
          const dx = Math.random() * w;
          const dy = Math.random() * h;
          const r = Math.max(1.5, Math.random() * (w * 0.08));
          ctx.beginPath();
          ctx.arc(dx, dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ensureFishPattern(index) {
      if (!this.fishTexturePool || index < 0 || index >= this.fishTexturePool.length) return null;
      let canvas = this.fishTexturePool[index];
      if (!canvas) {
        const { size } = this._fishTextureConfig;
        canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        try {
          this.generateFishTexture(canvas, null, '#444444');
        } catch (e) {
          logDevError('Failed to generate fish pattern texture', e);
          return null;
        }
        this.fishTexturePool[index] = canvas;
      }
      return canvas;
    }

    getFishTexture(patternIndex, colorFill, keyOverride = null) {
      const fill = colorFill || '#000000';
      const cacheKey = keyOverride || `${patternIndex}:${fill}`;
      let cached = this._fishPatternColorCache[cacheKey];
      if (cached) return cached;

      const patternCanvas = this.ensureFishPattern(patternIndex);
      if (!patternCanvas) return null;

      const { size } = this._fishTextureConfig;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        logDevError('Failed to obtain fish tint context', new Error('2D context unavailable'));
        return null;
      }
      try {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(patternCanvas, 0, 0, size, size);
        const tint = shadeColor(fill, -14);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      } catch (e) {
        logDevError('Failed to tint fish pattern', e);
        return null;
      }

      this._fishPatternColorCache[cacheKey] = canvas;
      return canvas;
    }

    setWatercolorPalette(palette) {
      if (!Array.isArray(palette) || palette.length === 0) return;
      this.watercolorPalette = palette.slice();
      this.generateWatercolor(this.watercolorCanvas, this.watercolorPalette);
    }

    setupEntities() {
      const { Bodies, World } = Matter;


      for (let i = 0; i < 20; i++) {
        const r = (this.worldRadius - 120) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const x = this.worldCenter.x + Math.cos(a) * r;
        const y = this.worldCenter.y + Math.sin(a) * r;
        const radius = 10 + Math.random() * 15;
        const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'rock' });
        // assign a random rotation to the rock and set the Matter body angle
        const rotation = Math.random() * Math.PI * 2;
        Matter.Body.setAngle(body, rotation);
        World.add(this.engine.world, body);
        const ent = { type: 'rock', body, radius, rotation };
        this.entities.push(ent);
        this.rockEntities.push(ent);
      }

      for (let i = 0; i < 8; i++) {
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
        const ent = { type: 'lilypad', body, radius, angle };
        this.entities.push(ent);
        this.lilypadEntities.push(ent);
      }

      for (let i = 0; i < 40; i++) {
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
        // give each leaf a tiny unique drift variation so they don't all move identically
        const driftFactor = 0.8 + Math.random() * 0.4; // 0.8..1.2 multiplier
        const driftPhase = Math.random() * Math.PI * 2;
        const driftFreq = 0.6 + Math.random() * 1.2; // slow per-leaf oscillation
        const driftAmp = 0.02 + Math.random() * 0.06; // small amplitude modifier

        const ent = {
          type: 'leaf',
          body,
          radius,
          // per-leaf drift modifiers applied on top of sharedLeafDrift
          driftFactor,
          driftPhase,
          driftFreq,
          driftAmp
        };
        this.entities.push(ent);
        this.leafEntities.push(ent);
      }

      const fishColors = [
        { fill: '#ff9966', stroke: '#ff7744' },
        { fill: '#ffcc66', stroke: '#ffaa44' },
        { fill: '#66ccff', stroke: '#44aaff' },
        { fill: '#cc99ff', stroke: '#aa77ff' },
        { fill: '#ff6699', stroke: '#ff4477' },
        { fill: '#1cd9ad', stroke: '#1cbba3' },
        { fill: '#474242', stroke: '#474242' }
      ];

      for (let i = 0; i < 35; i++) {
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
        // Prevent fish bodies from rotating due to collisions or forces.
        // Allow them to translate but keep a stable orientation so visual
        // schooling/facing logic (which reads velocities) remains smooth.
        try {
          // set inertia to Infinity to lock rotation
          Matter.Body.setInertia(body, Infinity);
          // ensure no residual angular velocity
          Matter.Body.setAngularVelocity(body, 0);
        } catch (e) {
          // Some Matter builds may not support these helpers; fall back to
          // setting the properties directly (best-effort).
          try {
            body.inertia = Infinity;
            body.angularVelocity = 0;
          } catch (e2) {
            logDevError('Failed to lock fish rotation', e2);
          }
        }
        const color = fishColors[i % fishColors.length];
        const patternIndex = Math.floor(Math.random() * this._fishTextureConfig.poolSize);
        const textureKey = `${patternIndex}:${color.fill || ''}`;

        const fishEnt = {
          type: 'fish',
          body,
          radius,
          fearRadius: 200,
          fleeTimer: 0,
          wanderAngle: Math.random() * Math.PI * 2,
          wanderChangeTimer: 600 + Math.random() * 1400,
          baseSpeed: this.FISH_BASE_SPEED,
          zoomTimer: 1500 + Math.random() * 4000,
          isZooming: false,
          zoomDuration: 0,
          zoomMultiplier: 1,
          inwardBias: 1,
          color,
          patternIndex,
          textureKey,
          // stable facing: 1 => right, -1 => left. We'll only flip when vx magnitude is significant.
          facing: 1,
          facingSwitchCooldown: 0,
          // goal-directed wandering: null when not heading to a specific target
          goal: null,
          goalTimeout: 0,
          goalWobblePhase: Math.random() * Math.PI * 2,
          goalWobbleFreq: 2 + Math.random() * 2,
          goalWobbleAmp: 0.6 + Math.random() * 1.0,
          idleTimer: 300 + Math.random() * 800
        };
        this.entities.push(fishEnt);
        this.fishEntities.push(fishEnt);
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
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

        const canvasX = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const canvasY = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

        // use the current camera zoom for pointer -> world mapping
        const zoomScale = this.camera.zoom || 1.0;

        const worldX = this.camera.x + (canvasX - this.canvas.width / 2 / this.dpr) / zoomScale;
        const worldY = this.camera.y + (canvasY - this.canvas.height / 2 / this.dpr) / zoomScale;

        return { x: worldX, y: worldY };
      };

      const onDown = (e) => {
        // preventDefault needs non-passive listeners to work on mobile
        try {
          e.preventDefault();
        } catch (err) {
          logDevError('Pointer preventDefault failed', err);
        }

        // Try to synchronously unlock audio during this user gesture (do not await)
        try {
          this.audioManager.unlockOnGesture();
        } catch (e) {
          logDevError('Immediate audio unlock on input failed', e);
          // fall back to the async resume attempt
          tryResumeAudio();
        }

        const pointer = getPointer(e);
        this.player.isDragging = true;
  this.player.inputTarget = pointer;
  // Always create ripple at the waterblob (player) position regardless of
  // where the user tapped. Use the Matter body position if available.
  const rpX = this.player.body && this.player.body.position ? this.player.body.position.x : this.player.x;
  const rpY = this.player.body && this.player.body.position ? this.player.body.position.y : this.player.y;
  this.createRipple(rpX, rpY);

        // double-tap detection (touch only)
        if (e.touches && e.touches.length > 0) {
          const now = performance.now();
          if (now - this.lastTapTime < 350) {
            // On double-tap, always create the whirlpool at the waterblob
            // regardless of where the user tapped.
            const wpX = this.player.body && this.player.body.position ? this.player.body.position.x : this.player.x;
            const wpY = this.player.body && this.player.body.position ? this.player.body.position.y : this.player.y;
            this.createWhirlpool(wpX, wpY);
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

  // register touch listeners as non-passive so preventDefault() works and input isn't delayed
  this.canvas.addEventListener('mousedown', onDown, { passive: false });
  this.canvas.addEventListener('mousemove', onMove, { passive: false });
  this.canvas.addEventListener('mouseup', onUp, { passive: false });
  this.canvas.addEventListener('touchstart', onDown, { passive: false });
      this.canvas.addEventListener('dblclick', (e) => {
        e.preventDefault();
        // Always spawn whirlpool at the waterblob/player position on dblclick
        const wpX = this.player.body && this.player.body.position ? this.player.body.position.x : this.player.x;
        const wpY = this.player.body && this.player.body.position ? this.player.body.position.y : this.player.y;
        this.createWhirlpool(wpX, wpY);
      });
      this.canvas.addEventListener('touchmove', onMove, { passive: false });
      this.canvas.addEventListener('touchend', onUp, { passive: false });
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

    // Animate camera zoom from current zoom to targetGameplayZoom over `duration` ms.
    // Returns a promise that resolves when animation completes.
    zoomToGameplay(duration = 2000) {
      return new Promise((resolve) => {
        const startZoom = this.camera.zoom || 1;
        const endZoom = this.targetGameplayZoom || 1;
        const startTime = performance.now();

        const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

        const step = () => {
          const now = performance.now();
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          const e = ease(t);
          this.camera.zoom = startZoom + (endZoom - startZoom) * e;

          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };

        requestAnimationFrame(step);
      });
    }

    createRipple(x, y) {
      const maxRadius = 220 + Math.random() * 60;
      this.ripples.push({ x, y, age: 0, life: 900, maxRadius });
      const noteIndex = Math.floor(Math.random() * 15);
      this.audioManager.playXylophoneNote(noteIndex);
    }

    createWhirlpool(x, y) {
      const life = 900;
      const maxRadius = 300 + Math.random() * 60;
      const spin = 1.2 + Math.random() * 1.8;
      this.whirlpools.push({ x, y, age: 0, life, maxRadius, spin });
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
          Matter.Body.applyForce(this.player.body, this.player.body.position, {
            x: (dx / dist) * this.PLAYER_MOVE_FORCE,
            y: (dy / dist) * this.PLAYER_MOVE_FORCE
          });
        }
      }

      this.player.x = this.player.body.position.x;
      this.player.y = this.player.body.position.y;

      this.rippleTimer += dt;
      const speed2 = this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2;
      if (speed2 > 0.5 * 0.5 && this.rippleTimer > 250) {
        this.createRipple(this.player.x, this.player.y);
        this.rippleTimer = 0;
      }

      this.ripples = this.ripples.filter(r => {
        r.age += dt;
        return r.age < r.life;
      });

      this.whirlpools = this.whirlpools.filter(w => {
        w.age += dt;
        const progress = w.age / w.life;
        const radius = w.maxRadius * progress;

        // Apply whirlpool forces to fish, leaves and lilypads (iterate typed arrays for less overhead)
        const applyTo = (list) => {
          for (let i = 0; i < list.length; i++) {
            const entity = list[i];
            const ex = entity.body.position.x - w.x;
            const ey = entity.body.position.y - w.y;
            const dist2 = ex*ex + ey*ey;
            if (dist2 > w.maxRadius * w.maxRadius) continue;

            const dist = Math.sqrt(dist2) || 0.0001; // compute sqrt only when inside radius
            const nx = ex / dist;
            const ny = ey / dist;

            const pushStrength = 0.0032 * (1 - (dist / w.maxRadius)) * (1 - progress);
            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: nx * pushStrength,
              y: ny * pushStrength
            });

            const tangential = w.spin * 0.0012 * (1 - (dist / w.maxRadius)) * (1 - progress);
            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: ny * tangential,
              y: -nx * tangential
            });
          }
        };

        applyTo(this.fishEntities);
        applyTo(this.leafEntities);
        applyTo(this.lilypadEntities);

        return w.age < w.life;
      });

      // Build spatial hash for neighbor queries (near-linear neighbor lookup)
      this._cellSize = this.FISH_NEIGHBOR_DISTANCE || 140;
      this._spatialHash = Object.create(null);
      const insertToHash = (entity) => {
        const x = entity.body.position.x;
        const y = entity.body.position.y;
        const cx = Math.floor(x / this._cellSize);
        const cy = Math.floor(y / this._cellSize);
        const key = cx + ':' + cy;
        let bucket = this._spatialHash[key];
        if (!bucket) {
          bucket = [];
          this._spatialHash[key] = bucket;
        }
        bucket.push(entity);
      };
      for (let i = 0; i < this.fishEntities.length; i++) insertToHash(this.fishEntities[i]);
      for (let i = 0; i < this.leafEntities.length; i++) insertToHash(this.leafEntities[i]);

  // Update fish and leaves using typed arrays (no per-frame filter allocations)
  // Run neighbor checks every physics step to avoid oscillation caused by
  // intermittent steering updates that can lead to jerky forces.
  const neighborCheckThisFrame = true;
      for (let i = 0; i < this.fishEntities.length; i++) {
        this.updateFish(this.fishEntities[i], dt, neighborCheckThisFrame);
      }
      for (let i = 0; i < this.leafEntities.length; i++) {
        this.updateLeaf(this.leafEntities[i], dt);
      }

      // update shared leaf drift timer and refresh gust when needed
      this.sharedLeafDriftTimer -= dt;
      if (this.sharedLeafDriftTimer <= 0) {
        this.sharedLeafDrift.vx = (Math.random() - 0.5) * 5;
        this.sharedLeafDrift.vy = (Math.random() - 0.5) * 5;
        this.sharedLeafDriftTimer = 3000 + Math.random() * 3000;
      }

      // Leaf repulsion removed (natural collisions handled by Matter.js)

      const targetCameraX = this.player.x;
      const targetCameraY = this.player.y;
      this.camera.x += (targetCameraX - this.camera.x) * 0.12;
      this.camera.y += (targetCameraY - this.camera.y) * 0.12;
    }

  updateFish(entity, dt, neighborCheck = true) {
      const dx = this.player.x - entity.body.position.x;
      const dy = this.player.y - entity.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

    entity.facingSwitchCooldown = Math.max(0, (entity.facingSwitchCooldown || 0) - dt);

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
        edgeAvoidX = -ex / distFromCenter;
        edgeAvoidY = -ey / distFromCenter;
      }

      if (dist < entity.fearRadius) {
        const nx = -dx / dist;
        const ny = -dy / dist;
        Matter.Body.applyForce(entity.body, entity.body.position, {
          x: nx * this.FISH_FLEE_FORCE,
          y: ny * this.FISH_FLEE_FORCE
        });
        entity.fleeTimer = 2000;
      } else if (entity.fleeTimer <= 0) {
        entity.wanderChangeTimer -= dt;
        if (entity.wanderChangeTimer <= 0) {
          entity.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.6;
          entity.wanderChangeTimer = 600 + Math.random() * 1400;
        }

        entity.zoomTimer -= dt;
        if (!entity.isZooming && entity.zoomTimer <= 0) {
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

        const currentSpeed = entity.baseSpeed * (entity.isZooming ? entity.zoomMultiplier : 1);
        const wanderX = Math.cos(entity.wanderAngle) * currentSpeed;
        const wanderY = Math.sin(entity.wanderAngle) * currentSpeed;

        const inwardStrength = Math.max(0, (edgeBuffer - distToBoundary) / edgeBuffer);
        const inwardX = edgeAvoidX * this.FISH_EDGE_FORCE * (0.5 + inwardStrength * 1.5) * entity.inwardBias;
        const inwardY = edgeAvoidY * this.FISH_EDGE_FORCE * (0.5 + inwardStrength * 1.5) * entity.inwardBias;

        let cohesionX = 0, cohesionY = 0;
        let alignX = 0, alignY = 0;
        let neighborCount = 0;

        // spatial hash neighbor search (check own cell and neighbors)
        // This is the most expensive part; optionally skip on alternating frames
        if (neighborCheck) {
          const cx = Math.floor(entity.body.position.x / this._cellSize);
          const cy = Math.floor(entity.body.position.y / this._cellSize);
          for (let ox = cx - 1; ox <= cx + 1; ox++) {
            for (let oy = cy - 1; oy <= cy + 1; oy++) {
              const key = ox + ':' + oy;
              const bucket = this._spatialHash[key];
              if (!bucket) continue;
              for (let bi = 0; bi < bucket.length; bi++) {
                const other = bucket[bi];
                if (other === entity) continue;
                // skip non-fish entities
                if (other.type !== 'fish') continue;
                const odx = other.body.position.x - entity.body.position.x;
                const ody = other.body.position.y - entity.body.position.y;
                const odist2 = odx * odx + ody * ody;
                const neighborDist2 = this.FISH_NEIGHBOR_DISTANCE * this.FISH_NEIGHBOR_DISTANCE;
                if (odist2 < neighborDist2) {
                  const odist = Math.sqrt(odist2) || 0.0001;
                  cohesionX += other.body.position.x;
                  cohesionY += other.body.position.y;
                  alignX += other.body.velocity.x;
                  alignY += other.body.velocity.y;
                  neighborCount++;

                  // Separation: closer than separation distance
                  // compute an effective separation distance; when both fish are
                  // effectively idle we add a small padding so they keep a little
                  // extra space between their bodies (reduces overlap visually).
                  const vA = Math.sqrt(entity.body.velocity.x * entity.body.velocity.x + entity.body.velocity.y * entity.body.velocity.y);
                  const vB = Math.sqrt(other.body.velocity.x * other.body.velocity.x + other.body.velocity.y * other.body.velocity.y);
                  const bothIdle = vA < 0.06 && vB < 0.06 && entity.fleeTimer <= 0 && (other.fleeTimer || 0) <= 0;
                  const effectiveSep = this.FISH_SEPARATION_DISTANCE + (bothIdle ? this.FISH_MIN_PADDING : 0);
                  if (odist < effectiveSep && odist > 0) {
                      const overlapFrac = Math.max(0, (effectiveSep - odist) / effectiveSep);
                      const base = this.FISH_SEPARATION_FORCE * (0.35 + 0.65 * overlapFrac);
                      const maxForce = this.FISH_SEPARATION_FORCE * 3.0;
                      const forceMag = Math.min(base, maxForce);
                      const inv = 1 / Math.max(odist, 0.5);
                      const nx = -odx * inv;
                      const ny = -ody * inv;
                      Matter.Body.applyForce(entity.body, entity.body.position, {
                        x: nx * forceMag,
                        y: ny * forceMag
                      });
                    // If fish are extremely close and both are nearly still (common at rest),
                    // apply a tiny deterministic separation by nudging one body a fraction
                    // of a pixel. This helps avoid exact overlaps which can cause
                    // flickering due to render ordering jitter. Keep this conservative.
                    // previously we used a tiny physics translate here to separate
                    // extremely close idle fish. That caused micro-vibrations when
                    // both fish repeatedly nudged each other. We now compute a
                    // purely visual offset during render to avoid touching the
                    // physics bodies here. No extra action required in the
                    // physics update loop.
                    if (this.DEBUG_FISH_SEPARATION) {
                      console.debug('Fish separation', {
                        fishId: entity.body.id,
                        neighborId: other.body.id,
                        distance: odist,
                        force: forceMag
                      });
                    }
                  }
                }
              }
            }
          }

          if (neighborCount > 0) {
            const inv = 1 / neighborCount;
            cohesionX = (cohesionX * inv - entity.body.position.x) * this.FISH_COHESION_FORCE;
            cohesionY = (cohesionY * inv - entity.body.position.y) * this.FISH_COHESION_FORCE;
            alignX = (alignX * inv) * this.FISH_ALIGNMENT_FORCE;
            alignY = (alignY * inv) * this.FISH_ALIGNMENT_FORCE;
          }
        } else {
          // light fallback: small random jitter to avoid completely static behaviour
          cohesionX = 0;
          cohesionY = 0;
          alignX = 0;
          alignY = 0;
        }

        // Base steering from wander/cohesion/alignment/edge avoidance
        let fx = wanderX + inwardX + cohesionX + alignX;
        let fy = wanderY + inwardY + cohesionY + alignY;

        // Occasionally pick a far-away random goal when the fish has been idle/slow
        const t = performance.now() / 1000;
        const vx = entity.body.velocity.x;
        const vy = entity.body.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);

        // idleTimer counts down while relatively slow; once it hits zero pick a goal
        if (!entity.goal) {
          if (speed < 0.06) {
            entity.idleTimer -= dt;
          } else {
            // reset idle timer when moving
            entity.idleTimer = Math.max(entity.idleTimer, 200 + Math.random() * 800);
          }

          if (entity.idleTimer <= 0) {
            // pick a new random goal somewhere else in the water (inside world circle)
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (this.worldRadius - 120);
            const gx = this.worldCenter.x + Math.cos(angle) * r;
            const gy = this.worldCenter.y + Math.sin(angle) * r;
            entity.goal = { x: gx, y: gy };
            entity.goalTimeout = 3000 + Math.random() * 5000;
            // small staggers so different fish wobble differently
            entity.goalWobblePhase = Math.random() * Math.PI * 2;
            entity.goalWobbleFreq = 1.5 + Math.random() * 2.5;
            entity.goalWobbleAmp = 0.5 + Math.random() * 1.2;
          }
        }

        // If we have a goal, steer toward it with a wavy offset
        if (entity.goal) {
          const gdx = entity.goal.x - entity.body.position.x;
          const gdy = entity.goal.y - entity.body.position.y;
          const gdist = Math.sqrt(gdx * gdx + gdy * gdy) || 0.0001;

          // If reached or timed out, clear the goal
          entity.goalTimeout -= dt;
          if (gdist < 24 || entity.goalTimeout <= 0) {
            entity.goal = null;
            entity.idleTimer = 800 + Math.random() * 1200;
          } else {
            // desired direction toward goal
            const ndx = gdx / gdist;
            const ndy = gdy / gdist;

            // perpendicular vector for wavy motion
            const px = -ndy;
            const py = ndx;

            // sinusoidal wobble based on time and fish-specific phase
            const wobble = Math.sin(t * entity.goalWobbleFreq + entity.goalWobblePhase) * entity.goalWobbleAmp;

            // seek force magnitude tuned a bit higher than base wander
            const seekStrength = entity.baseSpeed * 3.0;

            // add goal-directed (with wavy lateral component) to steering
            fx += ndx * seekStrength + px * wobble * 0.0009;
            fy += ndy * seekStrength + py * wobble * 0.0009;
          }
        }

        // finally apply the composed force
        Matter.Body.applyForce(entity.body, entity.body.position, {
          x: fx,
          y: fy
        });
      } else {
        entity.fleeTimer -= dt;
      }

      // Update facing based on horizontal velocity but only when vx magnitude is
      // above a small threshold to prevent rapid flipping when nearly stationary.
      try {
        const vx = entity.body.velocity.x;
        if (Math.abs(vx) > this.FISH_FACING_THRESHOLD) {
          const desiredFacing = vx >= 0 ? 1 : -1;
          if (desiredFacing !== entity.facing && entity.facingSwitchCooldown <= 0) {
            entity.facing = desiredFacing;
            entity.facingSwitchCooldown = this.FISH_FACING_COOLDOWN;
          } else if (desiredFacing === entity.facing) {
            entity.facingSwitchCooldown = 0;
          }
        }
      } catch (e) {
        logDevError('Fish facing update failed', e);
      }
    }

    updateLeaf(entity, dt) {
      // apply shared gust vector to leaves with a tiny per-leaf variation so
      // they don't all move at exactly the same velocity. This adds a slow
      // oscillation and a per-leaf multiplier.
      const t = performance.now() / 1000;
      const phase = (entity.driftPhase || 0) + t * (entity.driftFreq || 1);
      const osc = 1 + Math.sin(phase) * (entity.driftAmp || 0);
      const factor = (entity.driftFactor || 1) * osc;

      Matter.Body.applyForce(entity.body, entity.body.position, {
        x: this.sharedLeafDrift.vx * this.LEAF_DRIFT_FORCE * factor,
        y: this.sharedLeafDrift.vy * this.LEAF_DRIFT_FORCE * factor
      });
    }

    drawWaterBlob(ctx, x, y, radius, velocity, timeSeconds = null) {
      const points = this._blobPoints;
      // reuse preallocated coord objects to reduce garbage
      const cache = this._waterBlobCache || { coords: new Array(points) };
      const coords = cache.coords;
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      const stretchFactor = Math.min(speed / 100, 0.4);
      const angle = Math.atan2(velocity.y, velocity.x);
      const nowSeconds = timeSeconds !== null ? timeSeconds : performance.now() / 1000;

      // compute coords each frame using precomputed base cos/sin (cheap trig)
      for (let i = 0; i < points; i++) {
        const baseCos = this._blobBaseCos[i];
        const baseSin = this._blobBaseSin[i];
        const wobble = Math.sin(nowSeconds * (1.2 + i * 0.08) + i) * 0.08;
        let r = radius * (1 + wobble);
        const baseAngle = Math.atan2(baseSin, baseCos);
        const angleDiff = baseAngle - angle;
        const stretchInfluence = Math.cos(angleDiff);
        if (stretchInfluence > 0) r *= (1 + stretchFactor * stretchInfluence);
        else r *= (1 - stretchFactor * 0.3 * Math.abs(stretchInfluence));

        // mutate the preallocated object to avoid allocating a new one
        const c = coords[i];
        c.x = x + baseCos * r;
        c.y = y + baseSin * r;
      }

      // midpoint smoothing: move to midpoint of last and first, then quadraticCurveTo through midpoints
      const mid = (a, b) => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });
      ctx.beginPath();
      const lastMid = mid(coords[points - 1], coords[0]);
      ctx.moveTo(lastMid.x, lastMid.y);
      for (let i = 0; i < points; i++) {
        const curr = coords[i];
        const next = coords[(i + 1) % points];
        const nextMid = mid(curr, next);
        ctx.quadraticCurveTo(curr.x, curr.y, nextMid.x, nextMid.y);
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

    drawRocks(ctx, time) {
      const useImage = this.rockImageLoaded && this.rockImage && this.rockImage.complete && this.rockImage.naturalWidth > 0;
      for (let i = 0; i < this.rockEntities.length; i++) {
        const entity = this.rockEntities[i];
        const pos = entity.body.position;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
        ctx.scale(breathScale, breathScale);
        if (useImage) {
          const iw = this.rockImage.naturalWidth;
          const ih = this.rockImage.naturalHeight;
          const targetSize = entity.radius * 2;
          const scale = targetSize / Math.max(iw, ih);
          ctx.rotate(entity.rotation || 0);
          ctx.drawImage(this.rockImage, -iw * 0.5 * scale, -ih * 0.5 * scale, iw * scale, ih * scale);
        } else {
          if (this.rockPattern) {
            ctx.fillStyle = this.rockPattern;
          } else {
            ctx.fillStyle = this._rockTextureColor;
          }
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawLilypads(ctx, time) {
      const useImage = this.lilypadImageLoaded && this.lilypadImage && this.lilypadImage.complete && this.lilypadImage.naturalWidth > 0;
      for (let i = 0; i < this.lilypadEntities.length; i++) {
        const entity = this.lilypadEntities[i];
        const pos = entity.body.position;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
        ctx.scale(breathScale, breathScale);
        ctx.rotate(entity.body.angle || 0);
        if (useImage) {
          const iw = this.lilypadImage.naturalWidth;
          const ih = this.lilypadImage.naturalHeight;
          const targetSize = entity.radius * 2.2;
          const scale = targetSize / Math.max(iw, ih);
          ctx.drawImage(this.lilypadImage, -iw * 0.5 * scale, -ih * 0.5 * scale, iw * scale, ih * scale);
        } else {
          ctx.fillStyle = '#d3e8c6';
          ctx.beginPath();
          ctx.ellipse(0, 0, entity.radius * 1.2, entity.radius * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ddeded';
          ctx.beginPath();
          ctx.moveTo(entity.radius * 0.7, 0);
          ctx.lineTo(entity.radius * 1.2, -5);
          ctx.lineTo(entity.radius * 1.2, 5);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawLeaves(ctx, time) {
      const useImage = this.leafImageLoaded && this.leafImage && this.leafImage.complete && this.leafImage.naturalWidth > 0;
      for (let i = 0; i < this.leafEntities.length; i++) {
        const entity = this.leafEntities[i];
        const pos = entity.body.position;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        const breathScale = 1 + 0.015 * Math.sin(time * 1.5 + entity.body.id);
        ctx.scale(breathScale, breathScale);
  ctx.rotate(entity.body.angle || 0);
        if (useImage) {
          const iw = this.leafImage.naturalWidth;
          const ih = this.leafImage.naturalHeight;
          const targetSize = entity.radius * 2.5;
          const scale = targetSize / Math.max(iw, ih);
          ctx.drawImage(this.leafImage, -iw * 0.5 * scale, -ih * 0.5 * scale, iw * scale, ih * scale);
        } else {
          ctx.fillStyle = '#cbecc7';
          ctx.beginPath();
          ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawFish(ctx, time) {
      // Draw fish in a stable order based on their Y position so overlapping
      // sprites don't flicker when small position jitter changes render order.
      // We create a shallow sorted copy to avoid reordering the simulation list.
      const sorted = this.fishEntities.slice().sort((a, b) => {
        const ay = a.body.position.y || 0;
        const by = b.body.position.y || 0;
        if (ay === by) return (a.body.id || 0) - (b.body.id || 0);
        return ay - by;
      });

      for (let i = 0; i < sorted.length; i++) {
        const entity = sorted[i];
        const pos = entity.body.position;
        // apply any computed visual offset (smoothed per-entity)
        const vo = entity._visualOffset || { x: 0, y: 0 };
        ctx.save();
        ctx.translate(pos.x + (vo.x || 0), pos.y + (vo.y || 0));
        const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
        ctx.scale(breathScale, breathScale);
        const facing = entity.facing || 1;
        if (facing < 0) ctx.scale(-1, 1);

        const targetW = entity.radius * 3.0;
        const targetH = entity.radius * 1.4;

        ctx.fillStyle = entity.color.fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        const texture = this.getFishTexture(entity.patternIndex, entity.color.fill, entity.textureKey);
        if (texture && texture.width > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(0, 0, targetW / 2, targetH / 2, 0, 0, Math.PI * 2);
          ctx.clip();
          try {
            ctx.drawImage(texture, -targetW / 2, -targetH / 2, targetW, targetH);
          } catch (e) {
            logDevError('Fish texture draw failed', e);
          }
          ctx.restore();
        }

        ctx.fillStyle = entity.color.fill;
        ctx.beginPath();
        ctx.moveTo(-entity.radius * 1.5, 0);
        ctx.lineTo(-entity.radius * 2.2, -entity.radius * 0.6);
        ctx.lineTo(-entity.radius * 2.2, entity.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // Compute small purely-visual offsets for fish that are extremely close
    // to other fish. Offsets are smoothed per-entity to avoid popping and do
    // not affect physics bodies. Call this once per render frame before draw.
    computeFishVisualOffsets() {
      // initialize offsets
      for (let i = 0; i < this.fishEntities.length; i++) {
        const e = this.fishEntities[i];
        if (!e._visualOffset) e._visualOffset = { x: 0, y: 0 };
      }

      // naive O(N^2) for small N (35 fish) is fine; only look for very close neighbors
      for (let i = 0; i < this.fishEntities.length; i++) {
        const a = this.fishEntities[i];
        const ax = a.body.position.x;
        const ay = a.body.position.y;
        let ox = 0, oy = 0;
        let count = 0;
        for (let j = 0; j < this.fishEntities.length; j++) {
          if (i === j) continue;
          const b = this.fishEntities[j];
          const bx = b.body.position.x;
          const by = b.body.position.y;
          const dx = bx - ax;
          const dy = by - ay;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          const effectiveSep = this.FISH_SEPARATION_DISTANCE + ( (Math.sqrt(a.body.velocity.x*a.body.velocity.x + a.body.velocity.y*a.body.velocity.y) < 0.06 && Math.sqrt(b.body.velocity.x*b.body.velocity.x + b.body.velocity.y*b.body.velocity.y) < 0.06) ? this.FISH_MIN_PADDING : 0);
          if (d < Math.max(1, effectiveSep)) {
            // push a away vector (smaller magnitude than physics nudge)
            const push = (effectiveSep - d) / effectiveSep;
            ox -= (dx / d) * push * 0.7; // scale down to keep subtle
            oy -= (dy / d) * push * 0.7;
            count++;
          }
        }
        if (count > 0) {
          ox /= count;
          oy /= count;
        }
        // Smooth towards the computed offset to avoid sudden jumps
        const cur = a._visualOffset || { x: 0, y: 0 };
        const smooth = 0.14; // lower = slower smoothing
        cur.x = cur.x + (ox - cur.x) * smooth;
        cur.y = cur.y + (oy - cur.y) * smooth;
        a._visualOffset = cur;
      }
    }

    render() {
      const ctx = this.ctx;
      const dpr = this.dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

  this.refreshTexturesIfNeeded(ctx);

      // If grass is available we will render it in world-space after we apply
      // camera transforms so it moves with the camera. Otherwise, render the
      // static outside texture (or solid color) as before.
      const useGrass = (this.grassImageLoaded && this.grassImage && this.grassImage.complete && this.grassImage.naturalWidth > 0);

      if (!useGrass) {
        // static background behavior (use cached pattern if possible to avoid
        // creating a new CanvasPattern object every frame)
        let filled = false;
        try {
          if (this.outsidePattern) {
            ctx.fillStyle = this.outsidePattern;
            filled = true;
          } else if (this.outsideTextureCanvas && this.outsideTextureCanvas.width > 0) {
            const pattern = ctx.createPattern(this.outsideTextureCanvas, 'repeat');
            if (pattern) {
              this.outsidePattern = pattern;
              ctx.fillStyle = pattern;
              filled = true;
            }
          }
        } catch (e) {
          console.warn('Failed to create outside texture pattern:', e);
        }
  if (!filled) ctx.fillStyle = this._outsideTextureColor;
        ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
      } else {
        // leave the canvas background unfilled here — we'll draw the grass
        // after applying the camera transforms so it scrolls with the world.
        ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
      }

  // use the current camera zoom (may be animated between fit and gameplay)
  const zoomScale = this.camera.zoom || (window.innerHeight > window.innerWidth ? this.mobileZoomFactor : 1.0);

  ctx.translate(this.canvas.width / 2 / dpr, this.canvas.height / 2 / dpr);
  ctx.scale(zoomScale, zoomScale);
  ctx.translate(-this.camera.x, -this.camera.y);

      // If using grass, draw the repeating grass pattern in world-space so it
      // moves with the camera. We compute the visible world rectangle and fill
      // it with a pattern anchored to world coordinates.
      if (useGrass) {
        try {
          // prefer a cached pattern created on image load; create+cache here as
          // a fallback only if we don't already have one.
          let grassPattern = this.grassPattern;
          if (!grassPattern && this.grassImage && this.grassImage.complete && this.grassImage.naturalWidth > 0) {
            grassPattern = ctx.createPattern(this.grassImage, 'repeat');
            this.grassPattern = grassPattern;
          }
          if (grassPattern) {
            ctx.fillStyle = grassPattern;
            const screenWorldW = (this.canvas.width / dpr) / zoomScale;
            const screenWorldH = (this.canvas.height / dpr) / zoomScale;
            const worldLeft = this.camera.x - screenWorldW / 2;
            const worldTop = this.camera.y - screenWorldH / 2;
            ctx.fillRect(worldLeft, worldTop, screenWorldW, screenWorldH);
          }
        } catch (e) {
          console.warn('Failed to create/draw grass pattern in world-space:', e);
        }
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.worldCenter.x, this.worldCenter.y, this.worldRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const worldDrawX = this.worldCenter.x - this.worldRadius;
      const worldDrawY = this.worldCenter.y - this.worldRadius;
      ctx.drawImage(this.watercolorCanvas, worldDrawX, worldDrawY, this.worldDiameter, this.worldDiameter);

      ctx.restore();

      ctx.beginPath();
      ctx.arc(this.worldCenter.x, this.worldCenter.y, this.worldRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fill();
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 3;
      ctx.stroke();
      const time = performance.now() / 1000;
      this.drawRocks(ctx, time);
      this.drawLilypads(ctx, time);
      this.drawLeaves(ctx, time);
      // compute purely-visual offsets to avoid physics nudging/vibration
      try {
        this.computeFishVisualOffsets();
      } catch (e) {
        logDevError('computeFishVisualOffsets failed', e);
      }
      this.drawFish(ctx, time);

      this.drawWaterBlob(
        ctx,
        this.player.x,
        this.player.y,
        this.player.radius,
        this.player.body.velocity,
        time
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

      this.whirlpools.forEach(w => {
        const progress = w.age / w.life;
        const alpha = 1 - progress;
        const baseRadius = w.maxRadius * progress;
        const outerRadius = baseRadius * 0.75;
        const innerRadius = outerRadius * 0.6;

        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(time * w.spin * 0.6);

        ctx.strokeStyle = `rgba(110,160,200, ${alpha * 0.6})`;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(150,190,220, ${alpha * 0.4})`;
        ctx.lineWidth = 1.4 * (1 - progress);
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(time * w.spin * 0.3);
        ctx.strokeStyle = `rgba(200,230,245, ${alpha * 0.45})`;
        ctx.lineWidth = 1;
        const spokeLength = baseRadius * 0.45;
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(cos * innerRadius * 0.5, sin * innerRadius * 0.5);
          ctx.lineTo(cos * spokeLength, sin * spokeLength);
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

      // accumulate time and step physics at fixed rate to reduce CPU
      this._physicsAccumulator += dt;
      while (this._physicsAccumulator >= this._physicsStepMs) {
        // pass a fixed step in ms to update so physics runs at stable rate
        this.update(this._physicsStepMs);
        this._physicsAccumulator -= this._physicsStepMs;
      }

      // render with the partial dt (no physics update here)
      this.render();

      requestAnimationFrame(() => this.loop());
    }
  }

  onMount(() => {
    // create the game and pause it until the user presses Start
    game = new LittledropGame();
    game.paused = true;
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

  :global(html, body, #app) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }

  :global(#app) {
    position: fixed;
    inset: 0;
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

  /* splash overlay */
  #splashOverlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(rgba(10,20,30,0.35), rgba(10,20,30,0.45));
    z-index: 2000;
  }

  #splashCard {
    width: min(92vw, 300px);
    background: white;
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    text-align: center;
  }

  #splashCard h1 { margin-bottom: 8px; font-size: 28px; }
  #splashCard p { color: #444; margin-bottom: 18px; }

  #startBtn {
    background: #2d9cdb;
    color: white;
    border: none;
    padding: 12px 22px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
  }

  #startBtn:active { transform: scale(0.98); }
</style>

<canvas id="gameCanvas"></canvas>
<button id="pauseBtn" class="ui-button">⏸</button>
<button id="muteBtn" class="ui-button">🔊</button>

{#if showSplash}
  <div id="splashOverlay">
    <div id="splashCard">
      <h1>Littledrop</h1>
      <p>You are Littledrop 💧<br>Tap anywhere to move 🌀<br>Double-tap to splash 🌊<br>Sound on 🔊</p>
      <button id="startBtn" on:click={() => startGame()}>Start</button>
    </div>
  </div>
{/if}