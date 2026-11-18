import { TEXTS } from '../config/texts.js';

export class HudController {
  constructor() {
    this.levelEl = document.getElementById('level-label');
    this.gemsEl = document.getElementById('gems-label');
    this.solverEl = document.getElementById('solver-label');
    this.prevBtn = document.getElementById('btn-prev');
    this.nextBtn = document.getElementById('btn-next');
    this.restartBtn = document.getElementById('btn-restart');
    this.showPathBtn = document.getElementById('btn-show-path') || this.createToolbarButton('btn-show-path');
    this.controlsHintEl = document.getElementById('controls-hint');
    this.upBtn = document.getElementById('btn-up');
    this.downBtn = document.getElementById('btn-down');
    this.leftBtn = document.getElementById('btn-left');
    this.rightBtn = document.getElementById('btn-right');
  }

  createToolbarButton(id) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.style.cursor = 'pointer';
    if (this.restartBtn) {
      btn.className = this.restartBtn.className;
      if (this.restartBtn.parentElement) {
        this.restartBtn.parentElement.appendChild(btn);
      }
    } else {
      btn.style.margin = '4px';
      btn.style.padding = '6px 10px';
      document.body.appendChild(btn);
    }
    return btn;
  }

  initStaticTexts() {
    document.title = TEXTS.pageTitle;
    if (this.levelEl) this.levelEl.textContent = TEXTS.hud.initialLevel;
    if (this.gemsEl) this.gemsEl.textContent = TEXTS.hud.initialGems;
    if (this.solverEl) this.solverEl.textContent = TEXTS.hud.initialSolver;
    this.prevBtn.textContent = TEXTS.hud.prevButton;
    this.nextBtn.textContent = TEXTS.hud.nextButton;
    this.restartBtn.textContent = TEXTS.hud.restartButton;
    this.showPathBtn.textContent = TEXTS.hud.showPathButton;
    this.prevBtn.title = 'Anterior';
    this.nextBtn.title = 'Siguiente';
    this.restartBtn.title = 'Reiniciar (R)';
    this.showPathBtn.title = 'Ver solución (V)';
    this.controlsHintEl.innerHTML = TEXTS.hud.controlsHintHtml;
  }

  bindControls({ prevLevel, nextLevel, restart, togglePath, movePlayer }) {
    this.prevBtn.addEventListener('click', prevLevel);
    this.nextBtn.addEventListener('click', nextLevel);
    this.restartBtn.addEventListener('click', restart);
    this.showPathBtn.addEventListener('click', togglePath);
    if (movePlayer) {
      this.upBtn?.addEventListener('click', () => movePlayer(-1, 0));
      this.downBtn?.addEventListener('click', () => movePlayer(1, 0));
      this.leftBtn?.addEventListener('click', () => movePlayer(0, -1));
      this.rightBtn?.addEventListener('click', () => movePlayer(0, 1));
    }
  }

  update({ levelName, levelIndex, totalLevels, gemsLeft, solutionsCount, activeSolutionIndex, shownSolutionsTotal }) {
    if (this.levelEl) this.levelEl.textContent = TEXTS.hud.formatLevel(levelName, levelIndex + 1, totalLevels);
    if (this.gemsEl) this.gemsEl.textContent = TEXTS.hud.formatGems(gemsLeft);
    if (this.solverEl) {
      this.solverEl.textContent = solutionsCount === 1
        ? TEXTS.hud.solverUnique
        : TEXTS.hud.formatSolverMultiple(solutionsCount);
    }
    const isShowing = activeSolutionIndex >= 0;
    if (shownSolutionsTotal === 0) {
      this.showPathBtn.textContent = TEXTS.hud.noSolutionButton;
      this.showPathBtn.title = 'Sin solución';
    } else if (!isShowing) {
      this.showPathBtn.textContent = TEXTS.hud.showPathButton;
      this.showPathBtn.title = 'Ver solución (V)';
    } else if (shownSolutionsTotal > 1) {
      this.showPathBtn.textContent = TEXTS.hud.formatShowNextSolution(activeSolutionIndex + 1, shownSolutionsTotal);
      this.showPathBtn.title = `Solución ${activeSolutionIndex + 1}/${shownSolutionsTotal} (V)`;
    } else {
      this.showPathBtn.textContent = TEXTS.hud.hidePathButton;
      this.showPathBtn.title = 'Ocultar solución (V)';
    }
    this.showPathBtn.disabled = shownSolutionsTotal === 0;
    this.showPathBtn.setAttribute('aria-pressed', String(isShowing));
    this.showPathBtn.style.outline = isShowing ? '2px solid #38bdf8' : '';
  }
}