// Leyenda de mapas:
// '#' = Vacío
// '.' = Baldosa frágil
// 'R' = Roca (obstáculo)
// 'B' = Arbusto/Flor (obstáculo)
// 'G' = Gema sobre baldosa frágil
// 'S' = Inicio jugador sobre baldosa frágil
// 'E' = Enemigo sobre baldosa frágil
//
// Todas las baldosas del camino son frágiles y se destruyen al salir de ellas.
// Cada enemigo tiene asignado un único eje ('horizontal' o 'vertical')
// y un rango acotado [min, max] de 2 a 3 casilleros para
// interrumpir momentáneamente el único camino posible.

export const THEMES = {
  volcano: {
    biome: 'volcano',
    bgTop: 0x260608,
    bgBottom: 0x991b1b,
    skyGlow: 0xf97316,
    farLayer: 0x450a0a,
    midLayer: 0x5c1111,
    nearLayer: 0x7f1d1d,
    mistColor: 0xfb923c,
    accentGlow: 0xfef08a,
    particleColor: 0xf97316,
    tileTop: 0xcbd5e1,
    tileBorder: 0x94a3b8,
    tileSide: 0x475569,
    bushColor: 0x22c55e,
    bushHighlight: 0x86efac,
    rockColor: 0x94a3b8
  },
  glacier: {
    biome: 'glacier',
    bgTop: 0x082f49,
    bgBottom: 0x0284c7,
    skyGlow: 0x67e8f9,
    farLayer: 0x0c4a6e,
    midLayer: 0x075985,
    nearLayer: 0x0369a1,
    mistColor: 0xe0f2fe,
    accentGlow: 0xa5f3fc,
    particleColor: 0xe0f2fe,
    tileTop: 0xf1f5f9,
    tileBorder: 0xcbd5e1,
    tileSide: 0x64748b,
    bushColor: 0x0284c7,
    bushHighlight: 0x7dd3fc,
    rockColor: 0xcbd5e1
  },
  dungeon: {
    biome: 'dungeon',
    bgTop: 0x120b05,
    bgBottom: 0x451a03,
    skyGlow: 0xf59e0b,
    farLayer: 0x1c1208,
    midLayer: 0x29180a,
    nearLayer: 0x3b210d,
    mistColor: 0xd6d3d1,
    accentGlow: 0xfde047,
    particleColor: 0xa8a29e,
    tileTop: 0xb45309,
    tileBorder: 0x92400e,
    tileSide: 0x451a03,
    bushColor: 0xdc2626,
    bushHighlight: 0xf87171,
    rockColor: 0x78716c
  },
  meadow: {
    biome: 'meadow',
    bgTop: 0x0284c7,
    bgBottom: 0x1d4ed8,
    skyGlow: 0xfef08a,
    farLayer: 0x0369a1,
    midLayer: 0x15803d,
    nearLayer: 0x166534,
    mistColor: 0xdbeafe,
    accentGlow: 0xfde047,
    particleColor: 0x93c5fd,
    tileTop: 0xfef08a,
    tileBorder: 0xeab308,
    tileSide: 0xa16207,
    bushColor: 0xfacc15,
    bushHighlight: 0x16a34a,
    rockColor: 0x64748b
  }
};