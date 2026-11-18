import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_W,
  TILE_H,
  TILE_DEPTH,
  OFFSET_X,
  OFFSET_Y,
  CELL_TYPE
} from '../config/constants.js';

export class BoardRenderer {
  constructor(scene) {
    this.scene = scene;
    this.parallaxLayers = [];
    this.scrollingStrips = [];
    this.ambientParticles = [];
    this.twinkleStars = [];
  }

  gridToWorld(r, c) {
    return {
      x: OFFSET_X + c * TILE_W + TILE_W / 2,
      y: OFFSET_Y + r * TILE_H + TILE_H / 2
    };
  }

  drawBackground(theme) {
    this.parallaxLayers = [];
    this.scrollingStrips = [];
    this.ambientParticles = [];
    this.twinkleStars = [];

    const biome = theme.biome || 'volcano';
    const skyGlow = theme.skyGlow ?? theme.particleColor;
    const farColor = theme.farLayer ?? theme.bgTop;
    const midColor = theme.midLayer ?? theme.bgBottom;
    const nearColor = theme.nearLayer ?? theme.tileSide;
    const mistColor = theme.mistColor ?? theme.particleColor;
    const accentGlow = theme.accentGlow ?? theme.particleColor;

    const bg = this.addGraphics().setDepth(-60);
    bg.fillGradientStyle(
      theme.bgTop, theme.bgTop,
      theme.bgBottom, theme.bgBottom, 1
    );
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const skyLayer = this.scene.add.container(0, 0).setDepth(-56);
    const orbX = biome === 'meadow' ? GAME_WIDTH * 0.78 : GAME_WIDTH * 0.24;
    const orbY = biome === 'dungeon' ? 140 : 112;
    const skyGraphics = this.scene.add.graphics();
    skyGraphics.fillStyle(skyGlow, 0.08);
    skyGraphics.fillCircle(orbX, orbY, 130);
    skyGraphics.fillStyle(skyGlow, 0.14);
    skyGraphics.fillCircle(orbX, orbY, 82);
    skyGraphics.fillStyle(accentGlow, biome === 'meadow' ? 0.55 : 0.26);
    skyGraphics.fillCircle(orbX, orbY, biome === 'meadow' ? 36 : 44);
    if (biome === 'glacier') {
      skyGraphics.fillStyle(0x2dd4bf, 0.14);
      skyGraphics.fillEllipse(GAME_WIDTH * 0.52, 92, 460, 74);
      skyGraphics.fillStyle(0x38bdf8, 0.12);
      skyGraphics.fillEllipse(GAME_WIDTH * 0.44, 118, 360, 56);
    }
    skyLayer.add(skyGraphics);
    this.parallaxLayers.push({ container: skyLayer, strengthX: 8, strengthY: 4 });

    const starsLayer = this.scene.add.container(0, 0).setDepth(-53);
    const starCount = biome === 'meadow' ? 14 : 26;
    for (let i = 0; i < starCount; i++) {
      const sx = Phaser.Math.Between(18, GAME_WIDTH - 18);
      const sy = Phaser.Math.Between(14, GAME_HEIGHT * 0.62);
      const sr = Phaser.Math.FloatBetween(1.1, 2.5);
      const star = this.scene.add.circle(sx, sy, sr, accentGlow, 0.45);
      starsLayer.add(star);
      this.twinkleStars.push({
        sprite: star,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.0018, 0.0042),
        baseAlpha: biome === 'meadow' ? 0.28 : 0.52
      });
    }
    this.parallaxLayers.push({ container: starsLayer, strengthX: 12, strengthY: 6 });

    const farLayer = this.scene.add.container(0, 0).setDepth(-48);
    const stripWidth = GAME_WIDTH + 180;
    const farStripA = this.createBiomeSilhouette(biome, 'far', stripWidth, farColor, accentGlow);
    const farStripB = this.createBiomeSilhouette(biome, 'far', stripWidth, farColor, accentGlow);
    farStripA.x = -90;
    farStripB.x = -90 + stripWidth;
    farLayer.add([farStripA, farStripB]);
    this.parallaxLayers.push({ container: farLayer, strengthX: 18, strengthY: 8 });
    this.scrollingStrips.push({
      a: farStripA,
      b: farStripB,
      width: stripWidth,
      speed: biome === 'meadow' ? -8 : -4
    });

    const raysLayer = this.scene.add.container(0, 0).setDepth(-42);
    const raysG = this.scene.add.graphics();
    for (let i = 0; i < 3; i++) {
      const rx = 50 + i * 160;
      raysG.fillStyle(skyGlow, biome === 'meadow' ? 0.07 : 0.055);
      raysG.fillPoints([
        { x: rx, y: 0 },
        { x: rx + 55, y: 0 },
        { x: rx + 150, y: GAME_HEIGHT },
        { x: rx + 75, y: GAME_HEIGHT }
      ], true);
    }
    raysLayer.add(raysG);
    this.parallaxLayers.push({ container: raysLayer, strengthX: 22, strengthY: 9 });

    const midLayer = this.scene.add.container(0, 0).setDepth(-36);
    const midStripA = this.createBiomeSilhouette(biome, 'mid', stripWidth, midColor, accentGlow);
    const midStripB = this.createBiomeSilhouette(biome, 'mid', stripWidth, midColor, accentGlow);
    midStripA.x = -90;
    midStripB.x = -90 + stripWidth;
    midLayer.add([midStripA, midStripB]);
    this.parallaxLayers.push({ container: midLayer, strengthX: 30, strengthY: 13 });
    this.scrollingStrips.push({
      a: midStripA,
      b: midStripB,
      width: stripWidth,
      speed: biome === 'meadow' ? -12 : -7
    });

    const midParticlesLayer = this.scene.add.container(0, 0).setDepth(-28);
    this.spawnBiomeParticles(midParticlesLayer, biome, theme.particleColor, accentGlow, 22, 0.35, 1.5, 4);
    this.parallaxLayers.push({ container: midParticlesLayer, strengthX: 36, strengthY: 16 });

    const nearLayer = this.scene.add.container(0, 0).setDepth(-20);
    const nearStripA = this.createMistBand(stripWidth, nearColor, mistColor);
    const nearStripB = this.createMistBand(stripWidth, nearColor, mistColor);
    nearStripA.x = -90;
    nearStripB.x = -90 + stripWidth;
    nearLayer.add([nearStripA, nearStripB]);
    this.parallaxLayers.push({ container: nearLayer, strengthX: 44, strengthY: 18 });
    this.scrollingStrips.push({
      a: nearStripA,
      b: nearStripB,
      width: stripWidth,
      speed: -18
    });

    const nearParticlesLayer = this.scene.add.container(0, 0).setDepth(-14);
    this.spawnBiomeParticles(nearParticlesLayer, biome, mistColor, accentGlow, 12, 0.22, 3.5, 7);
    this.parallaxLayers.push({ container: nearParticlesLayer, strengthX: 54, strengthY: 22 });
  }

  createBiomeSilhouette(biome, depthKind, width, mainColor, accentColor) {
    const g = this.scene.add.graphics();
    const isFar = depthKind === 'far';
    const baseY = GAME_HEIGHT + 20;

    if (biome === 'volcano') {
      const peaks = isFar ? 4 : 5;
      const segW = width / peaks;
      g.fillStyle(mainColor, isFar ? 0.65 : 0.82);
      g.beginPath();
      g.moveTo(0, baseY);
      for (let i = 0; i <= peaks; i++) {
        const px = i * segW;
        const peakH = isFar
          ? (i % 2 === 0 ? GAME_HEIGHT * 0.44 : GAME_HEIGHT * 0.54)
          : (i % 2 === 0 ? GAME_HEIGHT * 0.62 : GAME_HEIGHT * 0.74);
        g.lineTo(px, peakH);
        if (!isFar && i < peaks) {
          g.lineTo(px + segW * 0.5, peakH + 65);
        }
      }
      g.lineTo(width, baseY);
      g.closePath();
      g.fillPath();

      if (!isFar) {
        g.lineStyle(2.5, accentColor, 0.28);
        for (let i = 1; i < peaks; i += 2) {
          const px = i * segW;
          const topY = GAME_HEIGHT * 0.68;
          g.beginPath();
          g.moveTo(px, topY);
          g.lineTo(px - 14, topY + 50);
          g.lineTo(px + 8, topY + 105);
          g.strokePath();
        }
      }
    } else if (biome === 'glacier') {
      const spires = isFar ? 5 : 6;
      const segW = width / spires;
      g.fillStyle(mainColor, isFar ? 0.52 : 0.72);
      g.beginPath();
      g.moveTo(0, baseY);
      for (let i = 0; i < spires; i++) {
        const sx = i * segW;
        const topY = isFar
          ? GAME_HEIGHT * 0.38 + (i % 3) * 32
          : GAME_HEIGHT * 0.58 + (i % 2) * 40;
        g.lineTo(sx + segW * 0.22, topY + 35);
        g.lineTo(sx + segW * 0.5, topY);
        g.lineTo(sx + segW * 0.85, topY + 48);
      }
      g.lineTo(width, baseY);
      g.closePath();
      g.fillPath();

      g.lineStyle(2, accentColor, isFar ? 0.2 : 0.35);
      for (let i = 0; i < spires; i++) {
        const sx = i * segW;
        const topY = isFar
          ? GAME_HEIGHT * 0.38 + (i % 3) * 32
          : GAME_HEIGHT * 0.58 + (i % 2) * 40;
        g.beginPath();
        g.moveTo(sx + segW * 0.5, topY);
        g.lineTo(sx + segW * 0.22, topY + 35);
        g.strokePath();
      }
    } else if (biome === 'dungeon') {
      if (isFar) {
        const arches = 4;
        const segW = width / arches;
        g.fillStyle(mainColor, 0.7);
        for (let i = 0; i < arches; i++) {
          const ax = i * segW;
          g.fillRect(ax + 12, GAME_HEIGHT * 0.3, 24, GAME_HEIGHT);
          g.fillRect(ax + segW - 36, GAME_HEIGHT * 0.3, 24, GAME_HEIGHT);
          g.fillRoundedRect(ax + 10, GAME_HEIGHT * 0.26, segW - 20, 34, 14);
          g.fillStyle(accentColor, 0.32);
          g.fillCircle(ax + segW * 0.5, GAME_HEIGHT * 0.36, 10);
          g.fillStyle(mainColor, 0.7);
        }
      } else {
        g.fillStyle(mainColor, 0.85);
        const wallTop = GAME_HEIGHT * 0.7;
        g.fillRect(0, wallTop, width, GAME_HEIGHT - wallTop + 20);
        for (let x = 30; x < width; x += 130) {
          g.fillRoundedRect(x, wallTop - 70, 42, 180, 6);
          g.fillStyle(accentColor, 0.4);
          g.fillCircle(x + 21, wallTop - 45, 5);
          g.fillStyle(mainColor, 0.85);
        }
      }
    } else {
      if (isFar) {
        g.fillStyle(0xffffff, 0.26);
        for (let cx = 60; cx < width; cx += 190) {
          const cy = 84 + ((cx / 190) % 2) * 34;
          g.fillCircle(cx, cy, 28);
          g.fillCircle(cx + 28, cy - 10, 34);
          g.fillCircle(cx + 58, cy, 26);
          g.fillRoundedRect(cx - 24, cy, 106, 26, 13);
        }
        g.fillStyle(mainColor, 0.55);
        for (let hx = 0; hx < width + 180; hx += 180) {
          g.fillEllipse(hx, GAME_HEIGHT * 0.74, 250, 200);
        }
      } else {
        g.fillStyle(mainColor, 0.75);
        for (let hx = 40; hx < width + 160; hx += 160) {
          g.fillEllipse(hx, GAME_HEIGHT * 0.8, 240, 190);
          g.fillStyle(accentColor, 0.6);
          g.fillCircle(hx - 24, GAME_HEIGHT * 0.72, 4);
          g.fillCircle(hx + 28, GAME_HEIGHT * 0.73, 3.5);
          g.fillStyle(mainColor, 0.75);
        }
      }
    }

    return g;
  }

  createMistBand(width, nearColor, mistColor) {
    const g = this.scene.add.graphics();
    g.fillStyle(nearColor, 0.34);
    for (let x = 0; x < width + 120; x += 130) {
      g.fillEllipse(x, GAME_HEIGHT - 12, 210, 86);
    }
    g.fillStyle(mistColor, 0.14);
    for (let x = 65; x < width + 120; x += 150) {
      g.fillEllipse(x, GAME_HEIGHT - 26, 240, 62);
    }
    return g;
  }

  spawnBiomeParticles(container, biome, primaryColor, accentColor, count, alpha, minR, maxR) {
    for (let i = 0; i < count; i++) {
      const px = Phaser.Math.FloatBetween(0, GAME_WIDTH);
      const py = Phaser.Math.FloatBetween(0, GAME_HEIGHT);
      const radius = Phaser.Math.FloatBetween(minR, maxR);
      const color = i % 3 === 0 ? accentColor : primaryColor;
      const sprite = this.scene.add.circle(px, py, radius, color, alpha);
      container.add(sprite);

      let vy = -Phaser.Math.FloatBetween(14, 34);
      let vx = Phaser.Math.FloatBetween(-8, 8);
      if (biome === 'glacier') {
        vy = Phaser.Math.FloatBetween(16, 36);
        vx = Phaser.Math.FloatBetween(-12, 12);
      } else if (biome === 'meadow') {
        vy = Phaser.Math.FloatBetween(-10, 12);
        vx = Phaser.Math.FloatBetween(10, 24);
      } else if (biome === 'dungeon') {
        vy = Phaser.Math.FloatBetween(-12, 6);
        vx = Phaser.Math.FloatBetween(-6, 6);
      }

      this.ambientParticles.push({
        sprite,
        vx,
        vy,
        baseAlpha: alpha,
        swayAmp: Phaser.Math.FloatBetween(8, 22),
        swayFreq: Phaser.Math.FloatBetween(0.0012, 0.0028),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
      });
    }
  }

  updateBackground(time, delta, normX = 0, normY = 0) {
    const dt = Math.min(delta, 50) / 1000;

    for (const layer of this.parallaxLayers) {
      if (!layer.container || !layer.container.active) continue;
      layer.container.x = -normX * layer.strengthX;
      layer.container.y = -normY * layer.strengthY;
    }

    for (const strip of this.scrollingStrips) {
      if (!strip.a?.active || !strip.b?.active) continue;
      strip.a.x += strip.speed * dt;
      strip.b.x += strip.speed * dt;
      if (strip.a.x <= -90 - strip.width) {
        strip.a.x = strip.b.x + strip.width;
      }
      if (strip.b.x <= -90 - strip.width) {
        strip.b.x = strip.a.x + strip.width;
      }
    }

    for (const star of this.twinkleStars) {
      if (!star.sprite?.active) continue;
      const pulse = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
      star.sprite.alpha = star.baseAlpha * (0.35 + pulse * 0.9);
      star.sprite.scale = 0.8 + pulse * 0.45;
    }

    for (const p of this.ambientParticles) {
      if (!p.sprite?.active) continue;
      p.sprite.x += (p.vx + Math.sin(time * p.swayFreq + p.phase) * p.swayAmp) * dt;
      p.sprite.y += p.vy * dt;

      if (p.sprite.y < -20) p.sprite.y = GAME_HEIGHT + 20;
      else if (p.sprite.y > GAME_HEIGHT + 20) p.sprite.y = -20;

      if (p.sprite.x < -20) p.sprite.x = GAME_WIDTH + 20;
      else if (p.sprite.x > GAME_WIDTH + 20) p.sprite.x = -20;

      const shimmer = 0.65 + 0.35 * Math.sin(time * (p.swayFreq * 1.6) + p.phase);
      p.sprite.alpha = p.baseAlpha * shimmer;
    }
  }

  createTile(r, c, type, theme) {
    const { x, y } = this.gridToWorld(r, c);
    const container = this.scene.add.container(x, y);
    const g = this.addGraphics();

    const hw = (TILE_W - 4) / 2;
    const hh = (TILE_H - 4) / 2;

    g.fillStyle(theme.tileSide, 1);
    g.fillRoundedRect(-hw, -hh + TILE_DEPTH, hw * 2, hh * 2, 6);

    const topColor = (type === CELL_TYPE.ROCK || type === CELL_TYPE.BUSH)
      ? theme.tileSide
      : theme.tileTop;
    g.fillStyle(topColor, 1);
    g.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 6);
    g.lineStyle(2, theme.tileBorder, 0.85);
    g.strokeRoundedRect(-hw, -hh, hw * 2, hh * 2, 6);

    if (type === CELL_TYPE.ROCK) {
      g.fillStyle(0x334155, 0.4);
      g.fillEllipse(0, 8, 44, 18);
      g.fillStyle(theme.rockColor, 1);
      g.fillRoundedRect(-18, -18, 36, 28, 12);
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(-6, -10, 7);
    } else if (type === CELL_TYPE.BUSH) {
      g.fillStyle(0x14532d, 0.35);
      g.fillEllipse(0, 10, 46, 18);
      g.fillStyle(theme.bushColor, 1);
      g.fillCircle(-10, -4, 13);
      g.fillCircle(10, -4, 13);
      g.fillCircle(0, -12, 15);
      g.fillStyle(theme.bushHighlight, 0.8);
      g.fillCircle(-4, -14, 5);
    }

    container.add(g);
    container.setDepth(r * 10);
    return container;
  }

  animateTileBreak(tileSprite) {
    if (!tileSprite) return;
    this.scene.tweens.add({
      targets: tileSprite,
      y: tileSprite.y + 85,
      angle: Phaser.Math.Between(-30, 30),
      alpha: 0,
      duration: 340,
      ease: 'Cubic.easeIn',
      onComplete: () => tileSprite.destroy()
    });
  }

  createGem(r, c) {
    const { x, y } = this.gridToWorld(r, c);
    const container = this.scene.add.container(x, y - 6);
    const g = this.addGraphics();

    g.fillStyle(0xf59e0b, 1);
    g.fillPoints([
      { x: 0, y: -16 },
      { x: 13, y: -5 },
      { x: 9, y: 13 },
      { x: -9, y: 13 },
      { x: -13, y: -5 }
    ], true);
    g.fillStyle(0xfef08a, 0.75);
    g.fillPoints([
      { x: 0, y: -14 },
      { x: 7, y: -5 },
      { x: 0, y: 4 },
      { x: -7, y: -5 }
    ], true);

    container.add(g);
    container.setDepth(r * 10 + 4);
    this.scene.tweens.add({
      targets: container,
      y: y - 12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return container;
  }

  animateGemCollect(gemSprite) {
    if (!gemSprite) return;
    this.scene.tweens.add({
      targets: gemSprite,
      scale: 1.7,
      alpha: 0,
      duration: 180,
      onComplete: () => gemSprite.destroy()
    });
  }

  createPlayer(r, c) {
    const { x, y } = this.gridToWorld(r, c);
    const container = this.scene.add.container(x, y - 10);

    const shadow = this.addGraphics();
    shadow.fillStyle(0x000000, 0.28);
    shadow.fillEllipse(0, 21, 30, 11);

    const visual = this.scene.add.container(0, 0);

    const body = this.addGraphics();
    body.fillStyle(0x78350f, 1);
    body.fillRoundedRect(-9, 14, 7, 6, 3);
    body.fillRoundedRect(2, 14, 7, 6, 3);

    body.fillStyle(0x2563eb, 1);
    body.fillRoundedRect(-12, 1, 24, 16, 8);
    body.fillStyle(0x60a5fa, 0.55);
    body.fillRoundedRect(-8, 3, 16, 10, 5);

    body.fillStyle(0xfde68a, 1);
    body.fillCircle(-12, 8, 4);
    body.fillCircle(12, 8, 4);

    body.fillStyle(0xf43f5e, 1);
    body.fillRoundedRect(-13, 0, 26, 7, 4);
    const scarfTail = this.addGraphics();
    scarfTail.fillStyle(0xe11d48, 1);
    scarfTail.fillRoundedRect(8, 2, 9, 10, 4);

    body.fillStyle(0x1d4ed8, 1);
    body.fillCircle(-13, -18, 6.5);
    body.fillCircle(13, -18, 6.5);
    body.fillStyle(0x93c5fd, 0.8);
    body.fillCircle(-13, -18, 3.2);
    body.fillCircle(13, -18, 3.2);

    body.fillStyle(0x1e40af, 1);
    body.fillCircle(0, -10, 17);
    body.fillStyle(0xfef3c7, 1);
    body.fillRoundedRect(-13, -18, 26, 20, 11);

    body.fillStyle(0x451a03, 1);
    body.fillEllipse(0, -18, 24, 9);
    body.fillCircle(-8, -15, 4.5);
    body.fillCircle(8, -15, 4.5);
    body.fillCircle(0, -16, 4.8);

    body.lineStyle(2, 0x15803d, 1);
    body.beginPath();
    body.moveTo(0, -26);
    body.lineTo(0, -31);
    body.strokePath();
    body.fillStyle(0x4ade80, 1);
    body.fillEllipse(-4, -32, 7, 4);
    body.fillEllipse(4, -32, 7, 4);

    body.fillStyle(0xfb7185, 0.62);
    body.fillEllipse(-9, -4, 6, 3.5);
    body.fillEllipse(9, -4, 6, 3.5);

    body.lineStyle(1.8, 0x78350f, 1);
    body.beginPath();
    body.arc(0, -4.5, 3, 0.25, Math.PI - 0.25, false);
    body.strokePath();

    const eyes = this.scene.add.container(0, -8);
    const eyesG = this.addGraphics();
    eyesG.fillStyle(0x111827, 1);
    eyesG.fillCircle(-5.5, 0, 3.4);
    eyesG.fillCircle(5.5, 0, 3.4);
    eyesG.fillStyle(0xffffff, 1);
    eyesG.fillCircle(-6.5, -1.2, 1.35);
    eyesG.fillCircle(4.5, -1.2, 1.35);
    eyesG.fillCircle(-4.6, 1.1, 0.65);
    eyesG.fillCircle(6.4, 1.1, 0.65);
    eyes.add(eyesG);

    visual.add([scarfTail, body, eyes]);
    container.add([shadow, visual]);
    container.setDepth(r * 10 + 6);

    container.visual = visual;
    container.shadow = shadow;
    container.facing = 1;

    this.scene.tweens.add({
      targets: visual,
      y: -2.2,
      scaleY: 1.03,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: scarfTail,
      angle: { from: -8, to: 10 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: eyes,
      scaleY: 0.1,
      duration: 75,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2500,
      ease: 'Quad.easeInOut'
    });

    return container;
  }

  createEnemy(r, c) {
    const { x, y } = this.gridToWorld(r, c);
    const container = this.scene.add.container(x, y - 10);

    const shadow = this.addGraphics();
    shadow.fillStyle(0x000000, 0.28);
    shadow.fillEllipse(0, 21, 30, 11);

    const visual = this.scene.add.container(0, 0);

    const leftWing = this.addGraphics();
    leftWing.fillStyle(0x991b1b, 1);
    leftWing.fillTriangle(-11, -3, -24, -12, -19, 3);
    leftWing.fillStyle(0xfca5a5, 0.4);
    leftWing.fillTriangle(-12, -2, -20, -8, -17, 1);

    const rightWing = this.addGraphics();
    rightWing.fillStyle(0x991b1b, 1);
    rightWing.fillTriangle(11, -3, 24, -12, 19, 3);
    rightWing.fillStyle(0xfca5a5, 0.4);
    rightWing.fillTriangle(12, -2, 20, -8, 17, 1);

    const tail = this.addGraphics();
    tail.lineStyle(2.5, 0x991b1b, 1);
    tail.beginPath();
    tail.moveTo(9, 11);
    tail.lineTo(17, 6);
    tail.strokePath();
    tail.fillStyle(0xfb7185, 1);
    tail.fillCircle(18, 5, 3);
    tail.fillTriangle(16, 4, 21, 2, 19, 8);

    const body = this.addGraphics();

    body.fillStyle(0x7f1d1d, 1);
    body.fillRoundedRect(-8, 13, 6.5, 5.5, 3);
    body.fillRoundedRect(1.5, 13, 6.5, 5.5, 3);

    body.fillStyle(0xb91c1c, 1);
    body.fillRoundedRect(-11, 2, 22, 14, 7);
    body.fillStyle(0xfecaca, 0.45);
    body.fillEllipse(0, 9, 12, 8);

    body.fillStyle(0xfef08a, 1);
    body.fillTriangle(-12, -16, -8, -26, -3, -18);
    body.fillTriangle(12, -16, 8, -26, 3, -18);
    body.fillCircle(-8, -25, 2);
    body.fillCircle(8, -25, 2);

    body.fillStyle(0xef4444, 1);
    body.fillCircle(0, -8, 15.5);
    body.fillStyle(0xfca5a5, 0.35);
    body.fillEllipse(-4, -16, 12, 6);

    body.fillStyle(0xfda4af, 0.65);
    body.fillEllipse(-9, -3, 5.8, 3.2);
    body.fillEllipse(9, -3, 5.8, 3.2);

    body.lineStyle(1.7, 0x450a0a, 1);
    body.beginPath();
    body.arc(0, -3.5, 3.2, 0.2, Math.PI - 0.2, false);
    body.strokePath();
    body.fillStyle(0xffffff, 1);
    body.fillTriangle(1.5, -1, 3.5, -1, 2.5, 1.5);

    const eyes = this.scene.add.container(0, -7.5);
    const eyesG = this.addGraphics();
    eyesG.fillStyle(0x450a0a, 1);
    eyesG.fillCircle(-5.5, 0, 3.6);
    eyesG.fillCircle(5.5, 0, 3.6);
    eyesG.fillStyle(0xfef08a, 1);
    eyesG.fillCircle(-5.5, 0, 2.8);
    eyesG.fillCircle(5.5, 0, 2.8);
    eyesG.fillStyle(0xffffff, 1);
    eyesG.fillCircle(-6.4, -1.1, 1.25);
    eyesG.fillCircle(4.6, -1.1, 1.25);
    eyes.add(eyesG);

    visual.add([tail, leftWing, rightWing, body, eyes]);
    container.add([shadow, visual]);
    container.setDepth(r * 10 + 5);

    container.visual = visual;
    container.shadow = shadow;
    container.facing = 1;

    this.scene.tweens.add({
      targets: visual,
      y: -3.5,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: leftWing,
      angle: { from: -14, to: 18 },
      duration: 240,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.scene.tweens.add({
      targets: rightWing,
      angle: { from: 14, to: -18 },
      duration: 240,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: tail,
      angle: { from: -10, to: 14 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: eyes,
      scaleY: 0.1,
      duration: 75,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2100,
      ease: 'Quad.easeInOut'
    });

    return container;
  }

  moveEntity(sprite, r, c, depth, duration, onComplete = null, options = {}) {
    const targetPos = this.gridToWorld(r, c);
    sprite.setDepth(depth);

    if (sprite.visual && options.dc) {
      sprite.facing = options.dc < 0 ? -1 : 1;
      sprite.visual.scaleX = sprite.facing;
    }

    if (sprite.visual) {
      this.scene.tweens.add({
        targets: sprite.visual,
        y: -12,
        duration: duration * 0.45,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    if (sprite.shadow) {
      this.scene.tweens.add({
        targets: sprite.shadow,
        scaleX: 0.72,
        scaleY: 0.72,
        duration: duration * 0.45,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    this.scene.tweens.add({
      targets: sprite,
      x: targetPos.x,
      y: targetPos.y - 10,
      duration,
      ease: 'Quad.easeOut',
      onComplete
    });
  }

  createActionButton(x, y, width, height, label, borderColor, onClick) {
    const container = this.scene.add.container(x, y);
    container.setDepth(190);

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x0f172a, 0.88)
      .setStrokeStyle(2, borderColor, 0.95)
      .setInteractive({ useHandCursor: true });

    const txt = this.scene.add.text(0, 0, label, {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#f8fafc'
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x1e293b, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(0x0f172a, 0.88));
    bg.on('pointerdown', onClick);

    container.add([bg, txt]);
    return {
      container,
      bg,
      txt,
      setLabel: (newLabel) => txt.setText(newLabel),
      setActive: (active) => bg.setStrokeStyle(2, active ? 0x34d399 : borderColor, 1),
      setEnabled: (enabled) => {
        container.setAlpha(enabled ? 1 : 0.45);
        if (enabled) bg.setInteractive({ useHandCursor: true });
        else bg.disableInteractive();
      }
    };
  }

  createPathOverlay(path, pathColor = 0x38bdf8) {
    if (!path || path.length === 0) return null;

    const container = this.scene.add.container(0, 0);
    container.setDepth(150);

    const glowGraphics = this.addGraphics();
    container.add(glowGraphics);

    const visitedSet = new Set();
    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      const key = `${step.r},${step.c}`;
      if (visitedSet.has(key)) continue;
      visitedSet.add(key);

      const { x, y } = this.gridToWorld(step.r, step.c);
      const isStart = i === 0;
      const isEnd = i === path.length - 1;
      const glowColor = isEnd ? 0x34d399 : (isStart ? 0xfbbf24 : pathColor);

      glowGraphics.fillStyle(glowColor, 0.34);
      glowGraphics.fillRoundedRect(x - (TILE_W - 10) / 2, y - (TILE_H - 10) / 2, TILE_W - 10, TILE_H - 10, 6);
      glowGraphics.lineStyle(2.5, glowColor, 0.9);
      glowGraphics.strokeRoundedRect(x - (TILE_W - 10) / 2, y - (TILE_H - 10) / 2, TILE_W - 10, TILE_H - 10, 6);
    }

    this.scene.tweens.add({
      targets: glowGraphics,
      alpha: { from: 0.72, to: 1 },
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const g = this.addGraphics();
    container.add(g);

    const edgeTotals = new Map();
    for (let i = 0; i < path.length - 1; i++) {
      const a = `${path[i].r},${path[i].c}`;
      const b = `${path[i + 1].r},${path[i + 1].c}`;
      const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
      edgeTotals.set(edgeKey, (edgeTotals.get(edgeKey) || 0) + 1);
    }

    const edgeSeen = new Map();
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = this.gridToWorld(path[i].r, path[i].c);
      const p2 = this.gridToWorld(path[i + 1].r, path[i + 1].c);
      const a = `${path[i].r},${path[i].c}`;
      const b = `${path[i + 1].r},${path[i + 1].c}`;
      const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;

      const total = edgeTotals.get(edgeKey) || 1;
      const seenIdx = edgeSeen.get(edgeKey) || 0;
      edgeSeen.set(edgeKey, seenIdx + 1);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const offset = total > 1 ? (seenIdx === 0 ? 7 : -7) : 0;

      const sx = p1.x + nx * offset;
      const sy = p1.y + ny * offset;
      const ex = p2.x + nx * offset;
      const ey = p2.y + ny * offset;

      g.lineStyle(6, 0x0f172a, 0.75);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();

      g.lineStyle(3, pathColor, 0.95);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();

      const mx = (sx + ex) / 2 + ux * 4;
      const my = (sy + ey) / 2 + uy * 4;
      g.fillStyle(0xfef08a, 0.98);
      g.fillTriangle(
        mx, my,
        mx - ux * 9 + nx * 5, my - uy * 9 + ny * 5,
        mx - ux * 9 - nx * 5, my - uy * 9 - ny * 5
      );
    }

    const cellVisits = new Map();
    path.forEach((step, idx) => {
      const key = `${step.r},${step.c}`;
      if (!cellVisits.has(key)) cellVisits.set(key, []);
      cellVisits.get(key).push(idx);
    });

    for (const [key, indices] of cellVisits.entries()) {
      const [r, c] = key.split(',').map(Number);
      const pos = this.gridToWorld(r, c);
      const label = indices.join('·');
      const isStart = indices[0] === 0;
      const isEnd = indices[indices.length - 1] === path.length - 1;

      g.fillStyle(0x0f172a, 0.92);
      g.fillRoundedRect(pos.x - 13, pos.y - 10, 26, 20, 6);
      g.lineStyle(2, isEnd ? 0x34d399 : (isStart ? 0xfbbf24 : pathColor), 0.95);
      g.strokeRoundedRect(pos.x - 13, pos.y - 10, 26, 20, 6);

      const txt = this.scene.add.text(pos.x, pos.y, label, {
        fontSize: indices.length > 1 ? '10px' : '11px',
        fontStyle: 'bold',
        color: isEnd ? '#34d399' : (isStart ? '#fbbf24' : '#f8fafc')
      }).setOrigin(0.5);
      container.add(txt);
    }

    return container;
  }

  showBanner(text, color) {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    this.scene.add.rectangle(centerX, centerY, 380, 74, 0x0f172a, 0.9)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color)
      .setDepth(200);
    this.scene.add.text(centerX, centerY, text, {
      fontSize: '21px',
      fontStyle: 'bold',
      color
    }).setOrigin(0.5).setDepth(201);
  }

  addGraphics() {
    return this.scene.add.graphics();
  }
}