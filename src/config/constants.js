export const GAME_WIDTH = 460;
export const GAME_HEIGHT = 700;

export const GRID_COLS = 6;
export const GRID_ROWS = 9;
export const TILE_W = 76;
export const TILE_H = 70;
export const TILE_DEPTH = 13;
export const OFFSET_X = (GAME_WIDTH - GRID_COLS * TILE_W) / 2;
export const OFFSET_Y = (GAME_HEIGHT - GRID_ROWS * TILE_H) / 2;

export const ENEMY_MOVE_DELAY_MS = 680;
export const ENEMY_REST_TICKS = 2;
export const WIN_NEXT_LEVEL_DELAY_MS = 1200;
export const LOSE_RESTART_DELAY_MS = 2000;
export const SOFTLOCK_RESTART_DELAY_MS = 4000;

export const ENEMY_AXIS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
};

export const ENEMY_PATROL_MIN_TILES = 2;
export const ENEMY_PATROL_MAX_TILES = 3;

export const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

export const CELL_TYPE = {
  EMPTY: 'EMPTY',
  FRAGILE: 'FRAGILE',
  PERMANENT: 'PERMANENT',
  ROCK: 'ROCK',
  BUSH: 'BUSH'
};

export const MAP_SYMBOL = {
  EMPTY: '#',
  FRAGILE: '.',
  PERMANENT: 'P',
  ROCK: 'R',
  BUSH: 'B',
  GEM: 'G',
  START: 'S',
  ENEMY: 'E'
};