// The index as data: what each node is, where it leads, and the miniature it opens into.
const NODES = [
  { id: 'cv', name: 'cv', title: 'Curriculum vitae', line: 'Mathematician · Predoctoral researcher', data: 'en · es · pdf', href: 'https://jonatanbb.xyz/cv/' },
  { id: '1g49', name: '1g49', title: '1g49', line: 'A project to make Galician pool broadcasts easier to follow.', data: 'proof of concept · 12.2026', href: '#' },
  { id: 'firecoat', name: 'firecoat.me', title: 'firecoat.me', line: 'A home for gembers.', data: 'the other side', href: 'https://firecoat.me', warm: true },
  { id: 'penquire', name: 'penquire', title: 'penquire', line: 'Every notebook I have filled, scanned.', data: '30 notebooks · 3029 pages', href: '#' },
  { id: 'lits', name: 'LitS', title: 'LitS', line: 'Research on LiDAR point clouds.', data: 'arXiv:2602.04838', href: 'https://arxiv.org/abs/2602.04838' },
  { id: 'cbteo', name: 'CB Teo', title: 'CB Teo', line: 'The club’s home, in three dimensions.', data: 'in the making', href: '#' },
];

// each miniature draws itself into the element it is given
const MINI = {
  cv: (el) => { el.innerHTML = `<svg viewBox="${BB.viewBox}"><path d="${BB.svgPath('bb')}" fill="currentColor" fill-rule="evenodd"/></svg>`; },
  firecoat: (el) => { el.innerHTML = `<svg viewBox="${BB.viewBox}"><path d="${BB.svgPath('db')}" fill="#b0475c" fill-rule="evenodd"/></svg>`; },
  '1g49': (el) => {
    const balls = [[122, 38], [137, 60], [151, 44], [140, 78], [108, 72], [163, 71]];
    el.innerHTML = `<svg viewBox="0 0 200 112" fill="none" stroke="currentColor" stroke-width="1.2">
      <rect x="12" y="12" width="176" height="88" rx="5"/><rect x="18" y="18" width="164" height="76" rx="2" stroke-width=".5" opacity=".5"/>
      ${[[14, 14], [100, 11], [186, 14], [14, 98], [100, 101], [186, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="currentColor" stroke="none"/>`).join('')}
      <path d="M58 60 L137 60 M137 60 L186 98" stroke-width=".7" stroke-dasharray="2.5 2.5" stroke="var(--signet)"/>
      ${balls.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.6" ${i === 1 ? 'fill="var(--gold)" stroke="var(--signet)"' : ''}/>`).join('')}
      <circle cx="58" cy="60" r="4.6" fill="currentColor"/>
      <g font-family="var(--mono)" font-size="5.6" fill="currentColor" stroke="none" opacity=".7"><text x="64" y="54">79.0</text><text x="150" y="88">37.7°</text></g></svg>`;
  },
  cbteo: (el) => {
    const P = (x, y, z) => [100 + (x - y) * 0.82, 62 + (x + y) * 0.42 - z];        // a small isometric room
    const L = (a, b, o = 1) => `<path d="M${P(...a)}L${P(...b)}" opacity="${o}"/>`;
    let s = '';
    for (let i = -60; i <= 60; i += 20) s += L([i, -60, 0], [i, 60, 0], .25) + L([-60, i, 0], [60, i, 0], .25);
    const box = (x0, y0, x1, y1, z0, z1, o) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((c, i, a) => L([...c, z1], [...a[(i + 1) % 4], z1], o) + L([...c, z0], [...c, z1], o)).join('');
    el.innerHTML = `<svg viewBox="0 0 200 112" fill="none" stroke="currentColor" stroke-width="1">${s}${box(-34, -18, 34, 18, 0, 16, 1)}
      <path d="M${P(-34, -18, 16)}L${P(34, -18, 16)}L${P(34, 18, 16)}L${P(-34, 18, 16)}Z" fill="var(--gold)" fill-opacity=".35" stroke="none"/>
      ${L([-60, -60, 0], [-60, -60, 46], .5)}${L([60, -60, 0], [60, -60, 46], .5)}${L([-60, 60, 0], [-60, 60, 46], .5)}${L([-60, -60, 46], [60, -60, 46], .5)}${L([-60, -60, 46], [-60, 60, 46], .5)}</svg>`;
  },
  lits: (el) => {
    let s = ''; const n = 150, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), a = i * ga, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const Y = y * .94 - z * .34, Z = z * .94 + y * .34;
      s += `<circle cx="${(100 + x * 46).toFixed(1)}" cy="${(56 - Y * 46).toFixed(1)}" r="${(1.1 + Z * .7).toFixed(2)}" opacity="${(.5 + Z * .45).toFixed(2)}"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 200 112"><g stroke="var(--signet)" stroke-width=".6" opacity=".9">${[[146, 30], [58, 24], [70, 96], [150, 84]].map(([x, y]) => `<path d="M100 56L${x} ${y}"/>`).join('')}</g><g fill="currentColor">${s}</g><circle cx="100" cy="56" r="2.6" fill="var(--gold)" stroke="var(--signet)" stroke-width=".6"/></svg>`;
  },
  penquire: (el) => { loadEq('gradient', window.MINI_INK || [28, 26, 22]).then((c) => { el.innerHTML = ''; el.appendChild(c); }); },
};
