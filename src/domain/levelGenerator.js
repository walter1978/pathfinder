import {
  GRID_COLS,
  GRID_ROWS,
  DIRECTIONS,
  MAP_SYMBOL,
  ENEMY_AXIS,
  ENEMY_PATROL_MAX_TILES
} from '../config/constants.js';
import { THEMES } from '../config/levels.js';
import { TEXTS } from '../config/texts.js';
import { analyzeLevelSolution } from './levelSolver.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function keyOf(r, c) {
  return `${r},${c}`;
}

function inPlayableBounds(r, c) {
  return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
}

function manhattan(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function countSetNeighbors(r, c, cellSet) {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (cellSet.has(keyOf(r + dr, c + dc))) count++;
  }
  return count;
}

function getDifficultyConfig(levelNumber) {
  const lvl = Math.max(1, levelNumber);
  const tier = Math.min(1, (lvl - 1) / 14);
  const minLen = Math.round(10 + tier * 8);
  const maxLen = Math.round(13 + tier * 10);
  const targetGems = lvl <= 2 ? 3 : lvl <= 5 ? 4 : lvl <= 10 ? 5 : randInt(5, 6);
  const clusterSize = lvl <= 2 ? 2 : 3;
  const maxSelfTouches = lvl <= 2 ? 1 : lvl <= 7 ? 2 : 3;
  const bridgeCount = lvl <= 2 ? 1 : lvl <= 6 ? 2 : 3;
  const decoyCount = lvl <= 2 ? 1 : lvl <= 6 ? 2 : 3;
  const desiredEnemies = lvl <= 2 ? 1 : lvl <= 8 ? 2 : randInt(2, 3);
  const minDecisions = lvl <= 2 ? 1 : lvl <= 6 ? 2 : 3;

  return {
    minLen,
    maxLen,
    targetGems,
    clusterSize,
    maxSelfTouches,
    bridgeCount,
    decoyCount,
    desiredEnemies,
    minDecisions
  };
}

function buildDetourPath(targetLen, maxSelfTouches) {
  const sr = randInt(1, 4);
  const sc = randInt(0, GRID_COLS - 1);
  const path = [{ r: sr, c: sc }];
  const pathSet = new Set([keyOf(sr, sc)]);
  let budget = 280;

  function dfs(selfTouches) {
    if (path.length >= targetLen) return true;
    if (--budget <= 0) return false;

    const curr = path[path.length - 1];
    const candidates = [];

    for (const [dr, dc] of DIRECTIONS) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (!inPlayableBounds(nr, nc)) continue;
      if (pathSet.has(keyOf(nr, nc))) continue;

      const touches = countSetNeighbors(nr, nc, pathSet) - 1;
      if (touches > 1) continue;
      if (selfTouches + touches > maxSelfTouches) continue;

      let onward = 0;
      for (const [dr2, dc2] of DIRECTIONS) {
        const rr = nr + dr2;
        const cc = nc + dc2;
        if (inPlayableBounds(rr, cc) && !pathSet.has(keyOf(rr, cc))) {
          onward++;
        }
      }
      if (onward === 0 && path.length + 1 < targetLen) continue;

      const touchBonus = touches === 1 && path.length >= 4 ? 1.8 : 0;
      candidates.push({
        r: nr,
        c: nc,
        touches,
        score: onward + touchBonus + Math.random() * 2.2
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    for (const next of candidates) {
      const key = keyOf(next.r, next.c);
      path.push({ r: next.r, c: next.c });
      pathSet.add(key);
      if (dfs(selfTouches + next.touches)) return true;
      path.pop();
      pathSet.delete(key);
    }

    return false;
  }

  return dfs(0) ? { path, pathSet } : null;
}

function findSingleBridgePocket(r, c, walkableSet) {
  for (const [dr, dc] of shuffle(DIRECTIONS)) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inPlayableBounds(nr, nc)) continue;
    if (walkableSet.has(keyOf(nr, nc))) continue;
    if (countSetNeighbors(nr, nc, walkableSet) === 1) {
      return { r: nr, c: nc };
    }
  }
  return null;
}

function toRawMap(charGrid) {
  return charGrid.map((row) => row.join(' '));
}

function hasUniqueSolution(charGrid) {
  const analysis = analyzeLevelSolution(toRawMap(charGrid), 2);
  return analysis.solutions === 1 && analysis.path;
}

function countDecisionPoints(charGrid, solutionPath) {
  const broken = new Set();
  let decisions = 0;

  for (let i = 0; i < solutionPath.length - 1; i++) {
    const curr = solutionPath[i];
    broken.add(keyOf(curr.r, curr.c));

    let unvisitedNeighbors = 0;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (!inPlayableBounds(nr, nc)) continue;
      if (broken.has(keyOf(nr, nc))) continue;
      const ch = charGrid[nr][nc];
      if (ch === MAP_SYMBOL.EMPTY || ch === MAP_SYMBOL.ROCK || ch === MAP_SYMBOL.BUSH) continue;
      unvisitedNeighbors++;
    }

    if (unvisitedNeighbors >= 2) {
      decisions++;
    }
  }

  return decisions;
}

function getMaxNearbyGemCluster(charGrid) {
  const gems = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (charGrid[r][c] === MAP_SYMBOL.GEM) {
        gems.push({ r, c });
      }
    }
  }

  let best = 0;
  for (const anchor of gems) {
    let nearby = 0;
    for (const other of gems) {
      if (manhattan(anchor, other) <= 2) nearby++;
    }
    if (nearby > best) best = nearby;
  }
  return best;
}

function pickRandomThemeEntry() {
  const keys = Object.keys(THEMES);
  const key = keys[randInt(0, keys.length - 1)];
  const rawName = TEXTS.levels[key] || key;
  const label = rawName.replace(/^\d+\.\s*/, '');
  return { key, label, theme: THEMES[key] };
}

function tryBuildLevelCandidate(themeEntry, levelNumber, config) {
  const targetLen = randInt(config.minLen, config.maxLen);
  const walk = buildDetourPath(targetLen, config.maxSelfTouches);
  if (!walk) return null;

  const { path, pathSet } = walk;
  const walkableSet = new Set(pathSet);
  const charGrid = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => MAP_SYMBOL.EMPTY)
  );

  for (const cell of path) {
    charGrid[cell.r][cell.c] = MAP_SYMBOL.FRAGILE;
  }

  const start = path[0];
  const end = path[path.length - 1];
  charGrid[start.r][start.c] = MAP_SYMBOL.START;
  charGrid[end.r][end.c] = MAP_SYMBOL.GEM;
  let gemCount = 1;

  for (let i = 0; i < path.length - 2 && gemCount < config.targetGems; i++) {
    for (let j = i + 2; j < path.length && gemCount < config.targetGems; j++) {
      if (manhattan(path[i], path[j]) !== 1) continue;
      let hasGemInside = false;
      for (let m = i + 1; m < j; m++) {
        if (charGrid[path[m].r][path[m].c] === MAP_SYMBOL.GEM) {
          hasGemInside = true;
          break;
        }
      }
      if (!hasGemInside) {
        const mid = Math.floor((i + j) / 2);
        const cell = path[mid];
        if (charGrid[cell.r][cell.c] === MAP_SYMBOL.FRAGILE) {
          charGrid[cell.r][cell.c] = MAP_SYMBOL.GEM;
          gemCount++;
        }
      }
    }
  }

  const minAnchor = Math.min(2, path.length - 3);
  const maxAnchor = Math.max(minAnchor, path.length - 3);
  const anchorIdx = randInt(minAnchor, maxAnchor);
  const anchorCell = path[anchorIdx];
  const clusterCandidates = [];
  for (let i = 1; i < path.length - 1; i++) {
    if (manhattan(path[i], anchorCell) <= 2) {
      clusterCandidates.push({ idx: i, dist: manhattan(path[i], anchorCell) });
    }
  }
  clusterCandidates.sort((a, b) => a.dist - b.dist);

  let clusterPlaced = 0;
  for (const cand of clusterCandidates) {
    if (charGrid[path[cand.idx].r][path[cand.idx].c] === MAP_SYMBOL.GEM) {
      clusterPlaced++;
    }
  }
  for (const cand of clusterCandidates) {
    if (clusterPlaced >= config.clusterSize || gemCount >= config.targetGems) break;
    const cell = path[cand.idx];
    if (charGrid[cell.r][cell.c] === MAP_SYMBOL.FRAGILE) {
      charGrid[cell.r][cell.c] = MAP_SYMBOL.GEM;
      gemCount++;
      clusterPlaced++;
    }
  }

  const fillerIndices = shuffle(
    Array.from({ length: Math.max(0, path.length - 2) }, (_, i) => i + 1)
  );
  for (const idx of fillerIndices) {
    if (gemCount >= config.targetGems) break;
    const cell = path[idx];
    if (charGrid[cell.r][cell.c] === MAP_SYMBOL.FRAGILE) {
      charGrid[cell.r][cell.c] = MAP_SYMBOL.GEM;
      gemCount++;
    }
  }

  if (!hasUniqueSolution(charGrid)) return null;

  const bridgeCandidates = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (walkableSet.has(keyOf(r, c))) continue;
      if (manhattan({ r, c }, start) <= 1) continue;
      if (countSetNeighbors(r, c, walkableSet) !== 2) continue;

      const touchedPathIndices = [];
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        const pIdx = path.findIndex((p) => p.r === nr && p.c === nc);
        if (pIdx >= 0) touchedPathIndices.push(pIdx);
      }
      if (
        touchedPathIndices.length === 2 &&
        Math.abs(touchedPathIndices[0] - touchedPathIndices[1]) >= 3
      ) {
        bridgeCandidates.push({ r, c });
      }
    }
  }

  let addedBridges = 0;
  for (const bridge of shuffle(bridgeCandidates)) {
    if (addedBridges >= config.bridgeCount) break;
    charGrid[bridge.r][bridge.c] = MAP_SYMBOL.FRAGILE;
    if (hasUniqueSolution(charGrid)) {
      walkableSet.add(keyOf(bridge.r, bridge.c));
      addedBridges++;
    } else {
      charGrid[bridge.r][bridge.c] = MAP_SYMBOL.EMPTY;
    }
  }

  let placedDecoys = 0;
  const decoyIndices = shuffle(
    Array.from({ length: Math.max(0, path.length - 2) }, (_, i) => i + 1)
  );
  for (const idx of decoyIndices) {
    if (placedDecoys >= config.decoyCount) break;
    const cell = path[idx];
    const pocket = findSingleBridgePocket(cell.r, cell.c, walkableSet);
    if (!pocket) continue;

    charGrid[pocket.r][pocket.c] = MAP_SYMBOL.FRAGILE;
    if (hasUniqueSolution(charGrid)) {
      walkableSet.add(keyOf(pocket.r, pocket.c));
      placedDecoys++;

      if (levelNumber >= 3 && Math.random() < 0.55) {
        const ext = findSingleBridgePocket(pocket.r, pocket.c, walkableSet);
        if (ext) {
          charGrid[ext.r][ext.c] = MAP_SYMBOL.FRAGILE;
          if (hasUniqueSolution(charGrid)) {
            walkableSet.add(keyOf(ext.r, ext.c));
          } else {
            charGrid[ext.r][ext.c] = MAP_SYMBOL.EMPTY;
          }
        }
      }
    } else {
      charGrid[pocket.r][pocket.c] = MAP_SYMBOL.EMPTY;
    }
  }

  const enemies = [];
  const guardedIndices = [];
  const enemyPathIndices = shuffle(
    Array.from({ length: Math.max(0, path.length - 3) }, (_, i) => i + 2)
  );

  for (const idx of enemyPathIndices) {
    if (enemies.length >= config.desiredEnemies) break;
    if (guardedIndices.some((gIdx) => Math.abs(gIdx - idx) < 2)) continue;

    const tile = path[idx];
    if (manhattan(tile, start) < 2) continue;

    const pocket = findSingleBridgePocket(tile.r, tile.c, walkableSet);
    if (!pocket) continue;

    charGrid[pocket.r][pocket.c] = MAP_SYMBOL.ENEMY;
    if (!hasUniqueSolution(charGrid)) {
      charGrid[pocket.r][pocket.c] = MAP_SYMBOL.EMPTY;
      continue;
    }

    walkableSet.add(keyOf(pocket.r, pocket.c));
    guardedIndices.push(idx);

    const axis = pocket.r === tile.r ? ENEMY_AXIS.HORIZONTAL : ENEMY_AXIS.VERTICAL;
    const dr = tile.r - pocket.r;
    const dc = tile.c - pocket.c;
    const beyondR = tile.r + dr;
    const beyondC = tile.c + dc;
    const canExtendThree =
      ENEMY_PATROL_MAX_TILES >= 3 &&
      inPlayableBounds(beyondR, beyondC) &&
      walkableSet.has(keyOf(beyondR, beyondC)) &&
      Math.random() < 0.6;

    const coords = axis === ENEMY_AXIS.HORIZONTAL
      ? [pocket.c, tile.c, ...(canExtendThree ? [beyondC] : [])]
      : [pocket.r, tile.r, ...(canExtendThree ? [beyondR] : [])];

    enemies.push({
      r: pocket.r,
      c: pocket.c,
      axis,
      min: Math.min(...coords),
      max: Math.max(...coords)
    });
  }

  if (enemies.length === 0) return null;

  const rawMapBeforeDecor = toRawMap(charGrid);
  const analysis = analyzeLevelSolution(rawMapBeforeDecor, 2);
  if (analysis.solutions !== 1 || !analysis.path || analysis.path.length < config.minLen) {
    return null;
  }

  const decisions = countDecisionPoints(charGrid, analysis.path);
  const maxCluster = getMaxNearbyGemCluster(charGrid);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (charGrid[r][c] !== MAP_SYMBOL.EMPTY) continue;
      if (countSetNeighbors(r, c, walkableSet) === 0) continue;
      if (Math.random() < 0.5) {
        charGrid[r][c] = Math.random() < 0.5 ? MAP_SYMBOL.ROCK : MAP_SYMBOL.BUSH;
      }
    }
  }

  const level = {
    id: `generated-${Date.now()}-${levelNumber}`,
    name: TEXTS.hud.formatGeneratedLevel(levelNumber, themeEntry.label),
    theme: themeEntry.theme,
    enemies,
    map: toRawMap(charGrid),
    isGenerated: true
  };

  return {
    level,
    meetsTargets: decisions >= config.minDecisions && maxCluster >= config.clusterSize,
    score: decisions * 10 + maxCluster * 5 + analysis.path.length
  };
}

function buildVerifiedFallbackLevel(themeEntry, levelNumber) {
  return {
    id: `generated-fallback-${levelNumber}-${Date.now()}`,
    name: TEXTS.hud.formatGeneratedLevel(levelNumber, themeEntry.label),
    theme: themeEntry.theme,
    enemies: [
      { r: 7, c: 5, axis: ENEMY_AXIS.HORIZONTAL, min: 4, max: 5 }
    ],
    map: [
      '# # # # # #',
      '# S . . G #',
      '# # # # . #',
      '# # G . . #',
      '# # . # # #',
      '# # . . # #',
      '# # # . # #',
      '# # # . . E',
      '# # # # G #'
    ],
    isGenerated: true
  };
}

export function generateUniqueLevel(levelNumber = 1) {
  const themeEntry = pickRandomThemeEntry();
  const config = getDifficultyConfig(levelNumber);
  let bestCandidate = null;

  for (let attempt = 0; attempt < 110; attempt++) {
    const result = tryBuildLevelCandidate(themeEntry, levelNumber, config);
    if (!result) continue;
    if (result.meetsTargets) return result.level;
    if (!bestCandidate || result.score > bestCandidate.score) {
      bestCandidate = result;
    }
  }

  return bestCandidate ? bestCandidate.level : buildVerifiedFallbackLevel(themeEntry, levelNumber);
}