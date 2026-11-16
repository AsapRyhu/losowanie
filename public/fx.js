(function () {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0';
  document.body.prepend(c);
  const x = c.getContext('2d');
  let W, H;
  const rs = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
  rs(); addEventListener('resize', rs);
  const fl = Array.from({ length: 90 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 2.5 + 0.8, s: Math.random() * 0.8 + 0.3, d: Math.random() * 6 }));
  (function tick() {
    x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,.8)';
    for (const f of fl) {
      f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.4;
      if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
      x.beginPath(); x.arc(f.x, f.y, f.r, 0, 7); x.fill();
    }
    requestAnimationFrame(tick);
  })();

  const k = document.createElement('canvas');
  k.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50';
  document.body.appendChild(k);
  const q = k.getContext('2d');
  const rk = () => { k.width = innerWidth; k.height = innerHeight; };
  rk(); addEventListener('resize', rk);
  let P = [], running = false;
  window.confetti = () => {
    const cols = ['#f5c542', '#d62839', '#2e8b57', '#ffffff', '#4aa3df'];
    for (let i = 0; i < 160; i++) P.push({ x: k.width / 2, y: k.height * 0.45, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 3, w: Math.random() * 8 + 4, h: Math.random() * 5 + 3, c: cols[i % 5], a: Math.random() * 6, life: 0 });
    if (!running) { running = true; loop(); }
  };
  function loop() {
    q.clearRect(0, 0, k.width, k.height);
    P = P.filter((p) => p.y < k.height + 20 && p.life < 240);
    for (const p of P) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.a += 0.2; p.life++;
      q.save(); q.translate(p.x, p.y); q.rotate(p.a); q.fillStyle = p.c; q.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); q.restore();
    }
    if (P.length) requestAnimationFrame(loop); else { running = false; q.clearRect(0, 0, k.width, k.height); }
  }
})();
