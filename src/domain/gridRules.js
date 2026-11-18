import {
  GRID_COLS,
  GRID_ROWS,
  DIRECTIONS,
  CELL_TYPE,
  MAP_SYMBOL,
  ENEMY_AXIS,
  ENEMY_REST_TICKS,
  ENEMY_PATROL_MIN_TILES,
  ENEMY_PATROL_MAX_TILES
} from '../config/constants.js';

export function parseRawMap(rawMap) {
  return rawMap.map((row) => row.trim().split(/\s+/));
}

export function symbolToCellType(symbol) {
  if (
    symbol === MAP_SYMBOL.FRAGILE ||
    symbol === MAP_SYMBOL.GEM ||
    symbol === MAP_SYMBOL.START ||
    symbol === MAP_SYMBOL.ENEMY
  ) {
    return CELL_TYPE.FRAGILE;
  }
  if (symbol === MAP_SYMBOL.ROCK) return CELL_TYPE.ROCK;
  if (symbol === MAP_SYMBOL.BUSH) return CELL_TYPE.BUSH;
  return CELL_TYPE.EMPTY;
}

export function isWalkableCell(grid, r, c) {
  if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return false;
  return grid[r][c] === CELL_TYPE.FRAGILE;
}

export function getWalkableNeighbors(grid, r, c) {
  const neighbors = [];
  for (const [dr, dc] of DIRECTIONS) {
    const nr = r + dr;
    const nc = c + dc;
    if (isWalkableCell(grid, nr, nc)) {
      neighbors.push({ r: nr, c: nc });
    }
  }
  return neighbors;
}

export function hasAvailableMoves(grid, r, c) {
  return DIRECTIONS.some(([dr, dc]) => isWalkableCell(grid, r + dr, c + dc));
}

export function getAxisBounds(grid, r, c, axis) {
  if (!isWalkableCell(grid, r, c)) return null;
  const isVertical = axis === ENEMY_AXIS.VERTICAL;
  const dr = isVertical ? 1 : 0;
  const dc = isVertical ? 0 : 1;
  const origin = isVertical ? r : c;

  let min = origin;
  while (isWalkableCell(grid, r + dr * (min - 1 - origin), c + dc * (min - 1 - origin))) {
    min--;
  }

  let max = origin;
  while (isWalkableCell(grid, r + dr * (max + 1 - origin), c + dc * (max + 1 - origin))) {
    max++;
  }

  return { min, max, length: max - min + 1 };
}

function clampPatrolWindow(origin, walkableMin, walkableMax, preferredMin = null, preferredMax = null) {
  let min = preferredMin !== null ? Math.max(walkableMin, preferredMin) : walkableMin;
  let max = preferredMax !== null ? Math.min(walkableMax, preferredMax) : walkableMax;

  if (min > origin) min = origin;
  if (max < origin) max = origin;

  // Limitar estrictamente el recorrido a un máximo de ENEMY_PATROL_MAX_TILES casilleros
  while (max - min + 1 > ENEMY_PATROL_MAX_TILES) {
    const distToMax = max - origin;
    const distToMin = origin - min;
    if (distToMax >= distToMin) max--;
    else min++;
  }

  return { min, max };
}

export function determineEnemyPatrol(grid, r, c, config = null) {
  const horizBounds = getAxisBounds(grid, r, c, ENEMY_AXIS.HORIZONTAL);
  const vertBounds = getAxisBounds(grid, r, c, ENEMY_AXIS.VERTICAL);

  let axis = null;
  if (config?.axis != null) {
    if (config.axis !== ENEMY_AXIS.HORIZONTAL && config.axis !== ENEMY_AXIS.VERTICAL) {
      throw new Error(
        `Eje de enemigo inválido: "${config.axis}". Solo se permite "${ENEMY_AXIS.HORIZONTAL}" o "${ENEMY_AXIS.VERTICAL}".`
      );
    }
    axis = config.axis;
  } else {
    const hLen = horizBounds?.length ?? 0;
    const vLen = vertBounds?.length ?? 0;
    if (hLen < ENEMY_PATROL_MIN_TILES && vLen < ENEMY_PATROL_MIN_TILES) {
      return { axis: null, fixedCoord: null, homeCoord: c, min: c, max: c, dir: 1, pauseTicks: 0 };
    }
    axis = hLen >= vLen ? ENEMY_AXIS.HORIZONTAL : ENEMY_AXIS.VERTICAL;
  }

  const isVertical = axis === ENEMY_AXIS.VERTICAL;
  const origin = isVertical ? r : c;
  const fixedCoord = isVertical ? c : r;
  const bounds = axis === ENEMY_AXIS.VERTICAL ? vertBounds : horizBounds;
  if (!bounds || bounds.length < ENEMY_PATROL_MIN_TILES) {
    return { axis: null, fixedCoord: null, homeCoord: origin, min: origin, max: origin, dir: 1, pauseTicks: 0 };
  }

  const { min, max } = clampPatrolWindow(
    origin,
    bounds.min,
    bounds.max,
    config?.min ?? null,
    config?.max ?? null
  );

  if (max - min + 1 < ENEMY_PATROL_MIN_TILES) {
    return { axis: null, fixedCoord: null, homeCoord: origin, min: origin, max: origin, dir: 1, pauseTicks: 0 };
  }

  let dir = 1;
  if (origin + 1 > max && origin - 1 >= min) {
    dir = -1;
  }

  return { axis, fixedCoord, homeCoord: origin, min, max, dir, pauseTicks: 1 };
}

export function getNextLinearPatrolStep(grid, enemy) {
  if (enemy.axis !== ENEMY_AXIS.HORIZONTAL && enemy.axis !== ENEMY_AXIS.VERTICAL) {
    return null;
  }

  if ((enemy.pauseTicks ?? 0) > 0) {
    return {
      r: enemy.r,
      c: enemy.c,
      dir: enemy.dir,
      pauseTicks: enemy.pauseTicks - 1,
      moved: false
    };
  }

  const isVertical = enemy.axis === ENEMY_AXIS.VERTICAL;
  const currentCoord = isVertical ? enemy.r : enemy.c;
  const lockedPerpCoord = enemy.fixedCoord ?? (isVertical ? enemy.c : enemy.r);

  const tryStep = (dir) => {
    const nextCoord = currentCoord + dir;
    if (nextCoord < enemy.min || nextCoord > enemy.max) return null;

    const nr = isVertical ? nextCoord : lockedPerpCoord;
    const nc = isVertical ? lockedPerpCoord : nextCoord;
    if (!isWalkableCell(grid, nr, nc)) return null;

    const pauseTicks = nextCoord === enemy.homeCoord ? ENEMY_REST_TICKS : 0;
    return { r: nr, c: nc, dir, pauseTicks, moved: true };
  };

  return tryStep(enemy.dir) || tryStep(-enemy.dir);
}