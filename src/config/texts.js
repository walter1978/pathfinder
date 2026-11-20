export const TEXTS = {
  pageTitle: 'Pathfinder - Prototipo Phaser 3',
  hud: {
    initialLevel: 'Nivel 1',
    initialGems: 'Gemas: 0',
    initialSolver: 'Camino único: verificando...',
    prevButton: '◀',
    nextButton: '▶',
    restartButton: '↻',
    showPathButton: '💡',
    hidePathButton: '💡',
    formatShowNextSolution: (current, total) => total > 1 ? `💡 ${current}/${total}` : '💡',
    noSolutionButton: '💡',
    controlsHintHtml:
      'Controles: <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> o <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> para moverte &nbsp;|&nbsp; ' +
      '<kbd>R</kbd> para reiniciar &nbsp;|&nbsp; ' +
      '<kbd>V</kbd> para ver solución &nbsp;|&nbsp; ' +
      'Todas las casillas del camino son <b>Frágiles</b> (se caen al salir de ellas)',
    formatLevel: (levelName, current, total) => `${levelName} (${current}/${total})`,
    formatGems: (gemsLeft) => `Gemas: ${gemsLeft}`,
    solverUnique: 'Camino único: 1 solución ✓',
    formatSolverMultiple: (count) => `Soluciones detectadas: ${count}`,
    formatGeneratedLevel: (index, baseName) => `${index}. ${baseName}`
  },
  levels: {
    volcano: 'Volcán',
    glacier: 'Glaciar',
    dungeon: 'Mazmorra',
    meadow: 'Pradera'
  },
  game: {
    winBanner: '¡NIVEL COMPLETADO!',
    loseEnemy: '¡Te atrapó un diablillo!',
    loseSoftlock: '¡Camino equivocado!\nYa no puedes recolectar todas las gemas',
    formatLoseBanner: (reason) => reason,
    winColor: '#34d399',
    loseColor: '#f87171'
  }
};