import { GRID_COLS, GRID_ROWS, DIRECTIONS, MAP_SYMBOL, CELL_TYPE } from '../config/constants.js';
import { parseRawMap } from './gridRules.js';

function solveUniqueDfs(rawMap, maxSolutions = 2) {
  const grid = parseRawMap(rawMap);
  let start = null;
  const gemIndex = new Map();
  const fragileIndex = new Map();
  let gemCount = 0;
  let fragileCount = 0;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const ch = grid[r][c];
      if (ch === MAP_SYMBOL.START) start = { r, c };
      if (ch === MAP_SYMBOL.GEM) gemIndex.set(`${r},${c}`, gemCount++);
      if (
        ch === MAP_SYMBOL.FRAGILE ||
        ch === MAP_SYMBOL.GEM ||
        ch === MAP_SYMBOL.START ||
        ch === MAP_SYMBOL.ENEMY
      ) {
        fragileIndex.set(`${r},${c}`, BigInt(fragileCount++));
      }
    }
  }

  if (!start || gemCount === 0) return { solutions: 0, path: null, paths: [] };
  const allGemsMask = (1 << gemCount) - 1;
  let solutions = 0;
  const paths = [];

  // Guardamos las tuplas (r, c, gemsMask, brokenMask) visitadas en la rama actual
  // para garantizar la exploración acotada sobre baldosas frágiles.
  function dfs(r, c, gemsMask, brokenMask, branchVisited, currentPath) {
    if (maxSolutions > 0 && solutions >= maxSolutions) return;
    if (gemsMask === allGemsMask) {
      solutions++;
      paths.push(currentPath.map((pos) => ({ ...pos })));
      return;
    }

    const currKey = `${r},${c}`;
    const isCurrFragile = fragileIndex.has(currKey);
    const nextBroken = isCurrFragile ? (brokenMask | (1n << fragileIndex.get(currKey))) : brokenMask;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;

      const cell = grid[nr][nc];
      if (cell === MAP_SYMBOL.EMPTY || cell === MAP_SYMBOL.ROCK || cell === MAP_SYMBOL.BUSH) continue;

      const nKey = `${nr},${nc}`;
      if (fragileIndex.has(nKey)) {
        const bit = 1n << fragileIndex.get(nKey);
        if ((nextBroken & bit) !== 0n) continue;
      }

      let nextGems = gemsMask;
      if (gemIndex.has(nKey)) {
        nextGems |= (1 << gemIndex.get(nKey));
      }

      const stateSig = `${nr},${nc},${nextGems},${nextBroken}`;
      if (branchVisited.has(stateSig)) continue;

      branchVisited.add(stateSig);
      currentPath.push({ r: nr, c: nc });
      dfs(nr, nc, nextGems, nextBroken, branchVisited, currentPath);
      currentPath.pop();
      branchVisited.delete(stateSig);
    }
  }

  const initSig = `${start.r},${start.c},0,0n`;
  const visited = new Set([initSig]);
  dfs(start.r, start.c, 0, 0n, visited, [{ r: start.r, c: start.c }]);
  return { solutions, path: solutions === 1 ? paths[0] : null, paths };
}

// Analiza el mapa y devuelve { solutions, path, paths } (hasta maxSolutions rutas)
export function analyzeLevelSolution(rawMap, maxSolutions = 8) {
  return solveUniqueDfs(rawMap, maxSolutions);
}

// Validador DFS de camino único (ignora enemigos para verificar la topología pura del puzle)
export function countUniqueSolutions(rawMap) {
  return solveUniqueDfs(rawMap, 2).solutions;
}

// Retorna la secuencia de coordenadas del único camino posible (o null si no es único)
export function getUniqueSolutionPath(rawMap) {
  const result = solveUniqueDfs(rawMap, 2);
  return result.solutions === 1 ? result.path : null;
}

// Determina si todavía existe al menos una ruta válida para recolectar todas las gemas restantes
export function canCompleteFromState(grid, startR, startC, gemCoordSet) {
  if (!gemCoordSet || gemCoordSet.size === 0) return true;

  // 1. Verificación rápida de conectividad de grafo mediante BFS
  const queue = [{ r: startR, c: startC }];
  const visitedBFS = new Set([`${startR},${startC}`]);
  let gemsFound = gemCoordSet.has(`${startR},${startC}`) ? 1 : 0;

  while (queue.length > 0) {
    const curr = queue.shift();
    for (const [dr, dc] of DIRECTIONS) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
      if (grid[nr][nc] !== CELL_TYPE.FRAGILE) continue;

      const nKey = `${nr},${nc}`;
      if (!visitedBFS.has(nKey)) {
        visitedBFS.add(nKey);
        if (gemCoordSet.has(nKey)) {
          gemsFound++;
        }
        queue.push({ r: nr, c: nc });
      }
    }
  }

  if (gemsFound < gemCoordSet.size) {
    return false;
  }

  // 2. DFS con poda por bitmask para verificar existencia de camino sobre suelo frágil
  const fragileIndex = new Map();
  const gemIndex = new Map();
  let fragileCount = 0;
  let gemCount = 0;

  for (const gKey of gemCoordSet) {
    gemIndex.set(gKey, gemCount++);
  }

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c] === CELL_TYPE.FRAGILE || (r === startR && c === startC)) {
        fragileIndex.set(`${r},${c}`, BigInt(fragileCount++));
      }
    }
  }

  const allGemsMask = (1 << gemCount) - 1;
  const startKey = `${startR},${startC}`;
  let initialGemsMask = 0;
  if (gemIndex.has(startKey)) {
    initialGemsMask |= (1 << gemIndex.get(startKey));
  }

  let stepBudget = 3000;

  function dfs(r, c, gemsMask, brokenMask, memo) {
    if (gemsMask === allGemsMask) return true;
    if (--stepBudget <= 0) return false;

    const currKey = `${r},${c}`;
    const currBit = fragileIndex.has(currKey) ? (1n << fragileIndex.get(currKey)) : 0n;
    const nextBroken = brokenMask | currBit;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
      if (grid[nr][nc] !== CELL_TYPE.FRAGILE) continue;

      const nKey = `${nr},${nc}`;
      if (fragileIndex.has(nKey)) {
        const bit = 1n << fragileIndex.get(nKey);
        if ((nextBroken & bit) !== 0n) continue;
      }

      let nextGems = gemsMask;
      if (gemIndex.has(nKey)) {
        nextGems |= (1 << gemIndex.get(nKey));
      }

      const memoKey = `${nr},${nc},${nextGems},${nextBroken}`;
      if (memo.has(memoKey)) continue;
      memo.add(memoKey);

      if (dfs(nr, nc, nextGems, nextBroken, memo)) {
        return true;
      }
    }

    return false;
  }

  const memo = new Set();
  memo.add(`${startR},${startC},${initialGemsMask},0n`);
  return dfs(startR, startC, initialGemsMask, 0n, memo);
}