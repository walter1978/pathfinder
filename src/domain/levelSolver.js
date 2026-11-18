import { GRID_COLS, GRID_ROWS, DIRECTIONS, MAP_SYMBOL } from '../config/constants.js';
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