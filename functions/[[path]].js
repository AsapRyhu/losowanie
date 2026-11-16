// ====== KONFIGURACJA (na sztywno) ======
const PINS = {
  Zuzanna: '4821',
  Maksymilian: '7394',
  Emilia: '1956',
  Dorota: '8402',
  Eryk: '3179',
  Mikołaj: '6528',
  Natalia: '9043',
};
const EXCLUDE = [['Maksymilian', 'Natalia'], ['Eryk', 'Dorota'], ['Mikołaj', 'Emilia']];
const DEFAULT_ADMIN_PASSWORD = 'admin2026';
// =======================================

const NAMES = Object.keys(PINS);
// Normalizacja loginu: bez spacji na brzegach, bez względu na wielkość liter.
const norm = (s) => String(s ?? '').trim().toLowerCase();
const resolveName = (s) => NAMES.find((n) => norm(n) === norm(s)) || null;
const J = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const bad = (a, b) =>
  a === b || EXCLUDE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

// Jeden zamknięty cykl: każdy losuje 1 osobę i jest wylosowany dokładnie raz.
function generatePairs() {
  for (let t = 0; t < 20000; t++) {
    const o = [...NAMES];
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

// Auto-inicjalizacja: jeśli w KV nie ma par, losujemy je i zapisujemy.
async function getPairs(KV) {
  let p = await KV.get('pairs', 'json');
  if (!p) {
    p = generatePairs();
    await KV.put('pairs', JSON.stringify(p));
  }
  return p;
}
const getWish = async (KV, n) => (await KV.get('wish:' + n)) || '';

export async function onRequest({ request, env, params }) {
  const KV = env.SANTA_KV;
  if (!KV) return J({ error: 'Brak bindingu SANTA_KV – podepnij KV w ustawieniach projektu i wdróż ponownie.' }, 500);
  const path = [].concat(params.path || []).join('/');
  const m = request.method;
  try {
    if (path === 'participants' && m === 'GET') {
      return J([...NAMES].sort((a, b) => a.localeCompare(b, 'pl')));
    }
    if (path === 'login' && m === 'POST') {
      const b = await request.json();
      const n = resolveName(b.name);
      if (!n || PINS[n] !== String(b.pin ?? '').trim()) return J({ error: 'Błędne imię lub PIN' }, 401);
      await getPairs(KV); // auto-inicjalizacja losowania przy pierwszym logowaniu
      return J({ ok: true, name: n });
    }

    // ---------- ADMIN ----------
    if (path.startsWith('admin/')) {
      const pw = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
      if (request.headers.get('x-admin') !== pw) return J({ error: 'Błędne hasło' }, 401);
      const a = path.slice(6);
      if (a === 'state' && m === 'GET') {
        const pairs = await getPairs(KV);
        const rows = await Promise.all(
          NAMES.map(async (n) => ({
            id: n,
            name: n,
            pin: PINS[n],
            target: pairs[n],
            has_drawn: !!(await KV.get('drawn:' + n)),
            wish: await getWish(KV, n),
            target_wish: await getWish(KV, pairs[n]),
          }))
        );
        return J(rows);
      }
      if (a === 'reset' && m === 'POST') {
        await KV.put('pairs', JSON.stringify(generatePairs()));
        await Promise.all(NAMES.map((n) => KV.delete('drawn:' + n)));
        return J({ ok: true });
      }
      return J({ error: 'Not found' }, 404);
    }

    // ---------- UŻYTKOWNIK ----------
    let rawUser = '';
    try { rawUser = decodeURIComponent(request.headers.get('x-user') || ''); } catch {}
    const name = resolveName(rawUser); // zawsze kanoniczna nazwa, np. "Zuzanna"
    if (!name || PINS[name] !== (request.headers.get('x-pin') || '').trim()) return J({ error: 'Brak autoryzacji' }, 401);

    if (path === 'me' && m === 'GET') {
      const pairs = await getPairs(KV);
      const drawn = !!(await KV.get('drawn:' + name));
      const t = pairs[name];
      return J({
        name,
        wish: await getWish(KV, name),
        has_drawn: drawn,
        target: drawn ? { name: t, wish: await getWish(KV, t) } : null,
      });
    }
    if (path === 'wish' && m === 'PUT') {
      const b = await request.json();
      await KV.put('wish:' + name, String(b.wish || '').slice(0, 600));
      return J({ ok: true });
    }
    if (path === 'reveal' && m === 'POST') {
      const t = (await getPairs(KV))[name];
      await KV.put('drawn:' + name, '1');
      return J({ target: { name: t, wish: await getWish(KV, t) } });
    }
    return J({ error: 'Not found' }, 404);
  } catch (e) {
    return J({ error: 'Błąd serwera: ' + e.message }, 500);
  }
}
