// Tienda: todo se compra con luz ganada fuera del móvil.
// Nada es aleatorio, nada caduca, nada acelera una misión.

export const SKINS = [
  {
    id: 'tierra', name: 'Tierra viva', price: 0, starter: true,
    desc: 'Océanos, bosques y cumbres nevadas.',
    palette: {
      deep: '#0d2c4a', shallow: '#2a7f9e', foam: '#8fd0d8', sand: '#d8c9a0', grass: '#6f9a4a',
      forest: '#3d6b35', dry: '#b59a63', rock: '#7a6f64', snow: '#f2f4f5', ice: '#e6eef2',
      atmosphere: '#8fc4ff', sea: 0.0, dryBand: 0.25, clouds: 0.55,
    },
  },
  {
    id: 'desierto', name: 'Desierto Solar', price: 0, starter: true,
    desc: 'Dunas doradas, oasis y mares pequeños.',
    palette: {
      deep: '#13385a', shallow: '#3a9bb0', foam: '#bfe3dd', sand: '#e6c88e', grass: '#9aa158',
      forest: '#61773c', dry: '#d6a35f', rock: '#9a6e4c', snow: '#f5ece0', ice: '#efe9e0',
      atmosphere: '#ffc98f', sea: -0.09, dryBand: 0.65, clouds: 0.25,
    },
  },
  {
    id: 'arrecife', name: 'Arrecife', price: 0, starter: true,
    desc: 'Archipiélagos y aguas turquesa.',
    palette: {
      deep: '#0a3557', shallow: '#22b3b8', foam: '#b5f0e6', sand: '#efe2bd', grass: '#5fa356',
      forest: '#2f7a46', dry: '#bca86e', rock: '#6f7a72', snow: '#f4f7f7', ice: '#e3f1f2',
      atmosphere: '#7fe0ff', sea: 0.1, dryBand: 0.12, clouds: 0.5,
    },
  },
  {
    id: 'aurora', name: 'Aurora Nocturna', price: 0, starter: true,
    desc: 'Taiga fría y luces en el cielo.',
    palette: {
      deep: '#0b1f3d', shallow: '#2b5f8a', foam: '#a9c8e6', sand: '#c9c2b0', grass: '#4f7d58',
      forest: '#28503d', dry: '#8f8a6f', rock: '#5d5a63', snow: '#f1f3fa', ice: '#dde6f5',
      atmosphere: '#b59cff', sea: -0.05, dryBand: 0.05, clouds: 0.6, aurora: true,
    },
  },
  {
    id: 'tundra', name: 'Tundra de Cristal', price: 420,
    desc: 'Hielo, roca azulada y mares fríos.',
    palette: {
      deep: '#0c2740', shallow: '#3e7fa0', foam: '#cfe8f2', sand: '#bdb8a8', grass: '#7a9478',
      forest: '#4b6b5b', dry: '#9d9a8a', rock: '#6c7480', snow: '#ffffff', ice: '#eaf4fb',
      atmosphere: '#c6e4ff', sea: -0.05, dryBand: 0.02, clouds: 0.7, cold: true,
    },
  },
  {
    id: 'marte', name: 'Óxido Marciano', price: 520,
    desc: 'Casi sin agua. Roca roja y casquetes blancos.',
    palette: {
      deep: '#2a2f45', shallow: '#4a6070', foam: '#9fb0b5', sand: '#c98a5a', grass: '#a8693f',
      forest: '#8a4f30', dry: '#b8693b', rock: '#7e3f28', snow: '#f3e7dc', ice: '#efe2d6',
      atmosphere: '#ffb08a', sea: -0.47, dryBand: 1, clouds: 0.12,
    },
  },
];

export const BOOSTS = [
  { id: 'anillos', name: 'Anillos de luz', price: 300, desc: 'Un anillo fino orbita tu planeta.' },
  { id: 'aurora', name: 'Aurora polar', price: 260, desc: 'Cortinas de luz sobre los polos.' },
  { id: 'estrellas', name: 'Cielo profundo', price: 160, desc: 'Más estrellas alrededor de tu mundo.' },
  { id: 'amanecer', name: 'Amanecer largo', price: 220, desc: 'La penumbra tarda el doble en llegar. No cambia lo que ganas.' },
];

const item = (id, kind, name, price, place, desc) => ({ id, kind, name, price, place, desc });

export const ITEMS = [
  // Naturaleza — en tierra
  item('arbol', 'naturaleza', 'Árbol', 40, 'land', 'Copa redonda, sombra para alguien.'),
  item('pino', 'naturaleza', 'Pino', 40, 'land', 'Aguanta el frío y el viento.'),
  item('abedul', 'naturaleza', 'Abedul', 50, 'land', 'Tronco claro, hojas finas.'),
  item('palmera', 'naturaleza', 'Palmera', 55, 'land', 'Para las costas cálidas.'),
  item('arbusto', 'naturaleza', 'Arbusto', 25, 'land', 'Pequeño y tozudo.'),
  item('flores', 'naturaleza', 'Prado de flores', 35, 'land', 'Manchas de color en la hierba.'),
  item('cactus', 'naturaleza', 'Cactus', 30, 'land', 'Paciencia hecha planta.'),
  item('roca', 'naturaleza', 'Rocas', 20, 'land', 'Un par de piedras con historia.'),
  item('cristal', 'naturaleza', 'Cristal', 70, 'land', 'Una formación que brilla suave.'),
  item('luciernagas', 'naturaleza', 'Luciérnagas', 60, 'land', 'Pequeñas luces al anochecer.'),
  // Estructuras — en tierra
  item('cabana', 'estructuras', 'Cabaña', 120, 'land', 'Un sitio donde quedarse.'),
  item('hoguera', 'estructuras', 'Hoguera', 80, 'land', 'Para sentarse en círculo.'),
  item('molino', 'estructuras', 'Molino', 180, 'land', 'Gira despacio con el viento.'),
  item('faro', 'estructuras', 'Faro', 200, 'land', 'Mejor en la costa.'),
  item('biblioteca', 'estructuras', 'Torre de lectura', 240, 'land', 'Ventanas que se encienden de noche.'),
  item('invernadero', 'estructuras', 'Invernadero', 210, 'land', 'Cristal y huerto dentro.'),
  item('observatorio', 'estructuras', 'Observatorio', 280, 'land', 'Una cúpula mirando arriba.'),
  item('cima', 'estructuras', 'La cima', 320, 'land', 'Piedra, columna, anillos y luz arriba.'),
  // Animales — en el agua
  item('ballena', 'animales', 'Ballena de datos', 260, 'water', 'Nada en círculos lentos.'),
  item('delfin', 'animales', 'Delfines', 150, 'water', 'Saltan de vez en cuando.'),
  item('tortuga', 'animales', 'Tortuga marina', 110, 'water', 'Sin prisa, como debe ser.'),
  item('peces', 'animales', 'Banco de peces', 70, 'water', 'Muchos que se mueven como uno.'),
  item('medusa', 'animales', 'Medusas', 90, 'water', 'Laten con una luz suave.'),
  item('manta', 'animales', 'Manta raya', 160, 'water', 'Vuela bajo el agua.'),
];

// Gestas: no se compran con luz. Se conceden por hacer cosas fuera.
export const FEATS = [
  item('raices', 'gestas', 'Raíces largas', null, 'land', '7 días seguidos con al menos una misión.'),
  item('farovoces', 'gestas', 'Faro de voces', null, 'land', '3 misiones de Gente.'),
  item('cumbre', 'gestas', 'Cumbre de la semana', null, 'land', 'Cumplir tu meta semanal.'),
];

export const ALL_ITEMS = [...ITEMS, ...FEATS];
export const itemById = (id) => ALL_ITEMS.find((x) => x.id === id);
export const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];

export const SHOP_SECTIONS = [
  { id: 'pieles', label: 'Pieles' },
  { id: 'mejoras', label: 'Mejoras' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'estructuras', label: 'Estructuras' },
  { id: 'animales', label: 'Animales' },
  { id: 'gestas', label: 'Gestas' },
];
