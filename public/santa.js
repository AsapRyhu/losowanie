export const EXCLUDE = [['Maksymilian', 'Natalia'], ['Eryk', 'Dorota'], ['Mikołaj', 'Emilia']];

const bad = (a, b) =>
  a === b || EXCLUDE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

// Losowy zamknięty cykl (każdy losuje 1 osobę, każdy jest wylosowany raz, brak wykluczonych par).
export function generatePairs(names) {
  for (let t = 0; t < 20000; t++) {
    const o = [...names];
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    if (o.every((n, i) => !bad(n, o[(i + 1) % o.length]))) {
      return Object.fromEntries(o.map((n, i) => [n, o[(i + 1) % o.length]]));
    }
  }
  throw new Error('Nie udało się wylosować poprawnych par');
}
