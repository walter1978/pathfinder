import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_ROWS,
  GRID_COLS,
  TILE_W,
  TILE_H,
  OFFSET_X,
  OFFSET_Y,
  ENEMY_MOVE_DELAY_MS,
  WIN_NEXT_LEVEL_DELAY_MS,
  CELL_TYPE,
  MAP_SYMBOL
} from '../config/constants.js';
import { TEXTS } from '../config/texts.js';
import {
  parseRawMap,
  symbolToCellType,
  isWalkableCell,
  hasAvailableMoves,
  determineEnemyPatrol,
  getNextLinearPatrolStep
} from '../domain/gridRules.js';
import { analyzeLevelSolution } from '../domain/levelSolver.js';
import { generateUniqueLevel } from '../domain/levelGenerator.js';
import { SoundFX } from '../audio/SoundFX.js';
import { BoardRenderer } from '../rendering/BoardRenderer.js';

const SOLUTION_COLORS = [
  0x38bdf8,
  0xe879f9,
  0xfb923c,
  0xa3e635,
  0xf43f5e,
  0x2dd4bf,
  0xfacc15,
  0x818cf8
];

export class PathfinderScene extends Phaser.Scene {
  constructor(hudController) {
    super('PathfinderScene');
    this.hud = hudController;
    this.sfx = new SoundFX();
    this.boardRenderer = new BoardRenderer(this);
    this.levels = [generateUniqueLevel(1)];
    this.currentLevelIndex = 0;
    this.activeSolutionIndex = -1;
    this.currentSolutionPaths = [];
    this.pathOverlay = null;
    this.parallaxFocus = { x: 0, y: 0 };
    this.swipeStart = null;
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D,R');

    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.loadLevel(this.currentLevelIndex);
        return;
      }
      if (e.code === 'KeyV') {
        this.togglePathVisualization();
        return;
      }
      if (this.gameOver || this.isMoving) return;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.tryMovePlayer(-1, 0);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.tryMovePlayer(1, 0);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.tryMovePlayer(0, -1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.tryMovePlayer(0, 1);
    });

    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.length > 0) {
        this.swipeStart = null;
        return;
      }
      this.swipeStart = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointerup', (pointer) => {
      const start = this.swipeStart;
      this.swipeStart = null;
      if (!start || this.gameOver || this.isMoving) return;

      const dx = pointer.x - start.x;
      const dy = pointer.y - start.y;
      if (Math.hypot(dx, dy) >= 24) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          this.tryMovePlayer(0, dx > 0 ? 1 : -1);
        } else {
          this.tryMovePlayer(dy > 0 ? 1 : -1, 0);
        }
        return;
      }

      if (start.y < OFFSET_Y || pointer.y < OFFSET_Y) return;

      const c = Math.floor((pointer.x - OFFSET_X) / TILE_W);
      const r = Math.floor((pointer.y - OFFSET_Y) / TILE_H);
      if (this.playerPos && Math.abs(r - this.playerPos.r) + Math.abs(c - this.playerPos.c) === 1) {
        this.tryMovePlayer(r - this.playerPos.r, c - this.playerPos.c);
      }
    });

    this.loadLevel(this.currentLevelIndex);
  }

  update(time, delta) {
    let targetX = 0;
    let targetY = 0;

    if (this.playerPos) {
      targetX += ((this.playerPos.c / (GRID_COLS - 1)) - 0.5) * 1.1;
      targetY += ((this.playerPos.r / (GRID_ROWS - 1)) - 0.5) * 1.1;
    }

    const pointer = this.input?.activePointer;
    if (pointer) {
      const px = Phaser.Math.Clamp(pointer.x / GAME_WIDTH - 0.5, -0.5, 0.5);
      const py = Phaser.Math.Clamp(pointer.y / GAME_HEIGHT - 0.5, -0.5, 0.5);
      targetX += px * 0.8;
      targetY += py * 0.8;
    }

    const lerp = Math.min(1, delta * 0.006);
    this.parallaxFocus.x = Phaser.Math.Linear(this.parallaxFocus.x, targetX, lerp);
    this.parallaxFocus.y = Phaser.Math.Linear(this.parallaxFocus.y, targetY, lerp);

    this.boardRenderer.updateBackground(time, delta, this.parallaxFocus.x, this.parallaxFocus.y);
  }

  loadLevel(index) {
    if (this.levels.length === 0) {
      this.levels.push(generateUniqueLevel(1));
    }
    if (index >= this.levels.length) {
      this.levels.push(generateUniqueLevel(this.levels.length + 1));
      this.currentLevelIndex = this.levels.length - 1;
    } else {
      this.currentLevelIndex = (index + this.levels.length) % this.levels.length;
    }
    const level = this.levels[this.currentLevelIndex];

    if (this.enemyTimer) this.enemyTimer.remove();
    this.children.removeAll(true);
    this.tweens.killAll();

    this.gameOver = false;
    this.isMoving = false;
    this.grid = [];
    this.tileSprites = [];
    this.gems = new Map();
    this.enemies = [];
    this.pathOverlay = null;

    this.boardRenderer.drawBackground(level.theme);

    const parsed = parseRawMap(level.map);
    let playerStart = { r: 0, c: 0 };

    for (let r = 0; r < GRID_ROWS; r++) {
      this.grid[r] = [];
      this.tileSprites[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const ch = parsed[r][c];
        const cellType = symbolToCellType(ch);

        this.grid[r][c] = cellType;
        this.tileSprites[r][c] = null;

        if (cellType !== CELL_TYPE.EMPTY) {
          this.tileSprites[r][c] = this.boardRenderer.createTile(r, c, cellType, level.theme);
        }

        if (ch === MAP_SYMBOL.GEM) {
          this.gems.set(`${r},${c}`, this.boardRenderer.createGem(r, c));
        } else if (ch === MAP_SYMBOL.START) {
          playerStart = { r, c };
        } else if (ch === MAP_SYMBOL.ENEMY) {
          this.enemies.push({
            r,
            c,
            axis: null,
            fixedCoord: null,
            homeCoord: 0,
            min: 0,
            max: 0,
            dir: 1,
            pauseTicks: 0,
            sprite: this.boardRenderer.createEnemy(r, c)
          });
        }
      }
    }

    const enemyConfigs = level.enemies || [];
    for (const enemy of this.enemies) {
      const config = enemyConfigs.find((cfg) => cfg.r === enemy.r && cfg.c === enemy.c) || null;
      const patrol = determineEnemyPatrol(this.grid, enemy.r, enemy.c, config);
      enemy.axis = patrol.axis;
      enemy.fixedCoord = patrol.fixedCoord;
      enemy.homeCoord = patrol.homeCoord;
      enemy.min = patrol.min;
      enemy.max = patrol.max;
      enemy.dir = patrol.dir;
      enemy.pauseTicks = patrol.pauseTicks;
    }

    this.playerPos = { ...playerStart };
    this.playerSprite = this.boardRenderer.createPlayer(playerStart.r, playerStart.c);

    this.enemyTimer = this.time.addEvent({
      delay: ENEMY_MOVE_DELAY_MS,
      loop: true,
      callback: () => this.moveEnemies()
    });

    const analysis = analyzeLevelSolution(level.map, 8);
    this.currentSolutionsCount = analysis.solutions;
    this.currentSolutionPaths = analysis.paths || [];
    this.activeSolutionIndex = this.activeSolutionIndex >= 0 && this.currentSolutionPaths.length > 0 ? 0 : -1;
    this.renderPathOverlay();
    this.syncHud();
  }

  renderPathOverlay() {
    if (this.pathOverlay) {
      this.pathOverlay.destroy(true);
      this.pathOverlay = null;
    }
    if (this.activeSolutionIndex >= 0 && this.currentSolutionPaths[this.activeSolutionIndex]) {
      const pathColor = SOLUTION_COLORS[this.activeSolutionIndex % SOLUTION_COLORS.length];
      this.pathOverlay = this.boardRenderer.createPathOverlay(
        this.currentSolutionPaths[this.activeSolutionIndex],
        pathColor
      );
    }
  }

  togglePathVisualization() {
    if (this.currentSolutionPaths.length === 0) return;
    this.activeSolutionIndex++;
    if (this.activeSolutionIndex >= this.currentSolutionPaths.length) {
      this.activeSolutionIndex = -1;
    }
    this.renderPathOverlay();
    this.syncHud();
  }

  tryMovePlayer(dr, dc) {
    if (this.gameOver || this.isMoving) return;

    const nr = this.playerPos.r + dr;
    const nc = this.playerPos.c + dc;
    if (!isWalkableCell(this.grid, nr, nc)) return;

    const oldR = this.playerPos.r;
    const oldC = this.playerPos.c;
    this.playerPos = { r: nr, c: nc };
    this.isMoving = true;
    this.sfx.step();

    if (this.grid[oldR][oldC] === CELL_TYPE.FRAGILE) {
      this.grid[oldR][oldC] = CELL_TYPE.EMPTY;
      const tile = this.tileSprites[oldR][oldC];
      this.tileSprites[oldR][oldC] = null;
      if (tile) {
        this.sfx.crack();
        this.boardRenderer.animateTileBreak(tile);
      }
    }

    this.boardRenderer.moveEntity(this.playerSprite, nr, nc, nr * 10 + 6, 125, () => {
      this.isMoving = false;
      this.afterPlayerStep(nr, nc);
    }, { dc });
  }

  afterPlayerStep(r, c) {
    if (this.enemies.some((e) => e.r === r && e.c === c)) {
      this.triggerLose(TEXTS.game.loseEnemy);
      return;
    }

    const key = `${r},${c}`;
    if (this.gems.has(key)) {
      const gem = this.gems.get(key);
      this.gems.delete(key);
      this.sfx.gem();
      this.boardRenderer.animateGemCollect(gem);
      this.syncHud();

      if (this.gems.size === 0) {
        this.triggerWin();
        return;
      }
    }

    if (!hasAvailableMoves(this.grid, r, c) && this.gems.size > 0) {
      this.triggerLose(TEXTS.game.loseSoftlock);
    }
  }

  moveEnemies() {
    if (this.gameOver) return;

    for (const enemy of this.enemies) {
      const next = getNextLinearPatrolStep(this.grid, enemy);
      if (!next) continue;

      enemy.pauseTicks = next.pauseTicks;
      if (!next.moved) {
        enemy.dir = next.dir;
        continue;
      }

      const prevC = enemy.c;
      enemy.r = next.r;
      enemy.c = next.c;
      enemy.dir = next.dir;

      this.boardRenderer.moveEntity(
        enemy.sprite,
        next.r,
        next.c,
        next.r * 10 + 5,
        180,
        null,
        { dc: next.c - prevC }
      );

      if (enemy.r === this.playerPos.r && enemy.c === this.playerPos.c) {
        this.triggerLose(TEXTS.game.loseEnemy);
        return;
      }
    }
  }

  triggerWin() {
    this.gameOver = true;
    this.sfx.win();
    this.boardRenderer.showBanner(TEXTS.game.winBanner, TEXTS.game.winColor);
    this.time.delayedCall(WIN_NEXT_LEVEL_DELAY_MS, () => {
      this.levels.push(generateUniqueLevel(this.levels.length + 1));
      this.loadLevel(this.levels.length - 1);
    });
  }

  triggerLose(reason) {
    this.gameOver = true;
    this.sfx.lose();
    this.boardRenderer.showBanner(TEXTS.game.formatLoseBanner(reason), TEXTS.game.loseColor);
  }

  syncHud() {
    const level = this.levels[this.currentLevelIndex];
    this.hud.update({
      levelName: level.name,
      levelIndex: this.currentLevelIndex,
      totalLevels: this.levels.length,
      gemsLeft: this.gems.size,
      solutionsCount: this.currentSolutionsCount,
      activeSolutionIndex: this.activeSolutionIndex,
      shownSolutionsTotal: this.currentSolutionPaths.length
    });
  }
}