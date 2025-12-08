/**
 * Game configuration constants
 * Centralized for easy tuning and modification
 */

// World dimensions
export const WORLD_DIAMETER = 2000;
export const WORLD_RADIUS = WORLD_DIAMETER / 2;
export const WORLD_CENTER = { x: WORLD_RADIUS, y: WORLD_RADIUS };

// Camera
export const MOBILE_ZOOM_FACTOR = 0.8;

// Player physics
export const PLAYER_MOVE_FORCE = 0.0015;
export const PLAYER_RADIUS = 18;

// Fish behavior
export const FISH_FLEE_FORCE = 0.0006;
export const FISH_BASE_SPEED = 0.0003;
export const FISH_EDGE_FORCE = 0.0006;
export const FISH_SEPARATION_FORCE = 0.00012;
export const FISH_COHESION_FORCE = 0.00018;
export const FISH_ALIGNMENT_FORCE = 0.00008;
export const FISH_NEIGHBOR_DISTANCE = 140;
export const FISH_SEPARATION_DISTANCE = 40;
export const FISH_MIN_PADDING = 20;
export const FISH_FACING_THRESHOLD = 0.06;
export const FISH_FACING_COOLDOWN = 220;

// Leaf behavior
export const LEAF_DRIFT_FORCE = 0.00005;

// Whirlpool settings
export const WHIRLPOOL_PROXIMITY = 400;
export const WHIRLPOOL_PUSH_STRENGTH = 0.0032;
export const WHIRLPOOL_TANGENTIAL_FACTOR = 0.0012;
export const WHIRLPOOL_TRANSFORM_RADIUS = 0.6; // fraction of maxRadius

// Particle effects
export const PARTICLE_COUNT = 12;
export const PARTICLE_LIFE = 800;
export const PARTICLE_SPEED_MIN = 0.8;
export const PARTICLE_SPEED_MAX = 2.5;
export const PARTICLE_SIZE_MIN = 3;
export const PARTICLE_SIZE_MAX = 8;
export const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD'];

// Rendering
export const BLOB_POINTS = 9;

// Physics timing
export const PHYSICS_STEP_MS = 1000 / 60; // 60 Hz physics

// Entity counts
export const ROCK_COUNT = 20;
export const LILYPAD_COUNT = 8;
export const LEAF_COUNT = 40;
export const FISH_COUNT = 35;
