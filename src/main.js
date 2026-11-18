import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { HudController } from './ui/HudController.js';
import { PathfinderScene } from './scenes/PathfinderScene.js';

const hudController = new HudController();
hudController.initStaticTexts();

const pathfinderScene = new PathfinderScene(hudController);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0f172a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [pathfinderScene]
});

const api = {
  restart: () => pathfinderScene.loadLevel(pathfinderScene.currentLevelIndex),
  nextLevel: () => pathfinderScene.loadLevel(pathfinderScene.currentLevelIndex + 1),
  prevLevel: () => pathfinderScene.loadLevel(pathfinderScene.currentLevelIndex - 1),
  togglePath: () => pathfinderScene.togglePathVisualization(),
  movePlayer: (dr, dc) => pathfinderScene.tryMovePlayer(dr, dc)
};

hudController.bindControls(api);

const refreshScale = () => {
  if (game?.scale) {
    game.scale.refresh();
  }
};
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 120));
const gameContainerEl = document.getElementById('game-container');
if (gameContainerEl && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(refreshScale).observe(gameContainerEl);
}

window.gameApi = api;
window.pathfinderGame = game;