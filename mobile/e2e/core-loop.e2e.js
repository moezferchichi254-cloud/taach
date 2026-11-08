const { chromium } = require('playwright');
// Usage: npm run export:web, then node e2e/serve.js $PWD/dist 8099 & and node e2e/core-loop.e2e.js <out-dir> [light|dark]
const out = process.argv[2], base = 'http://localhost:8099';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: process.argv[3] || 'light', locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
  const tid = (id) => p.getByTestId(id);

  await p.goto(base); await p.waitForTimeout(1500);
  await shot('S01-sign-in');
  await tid('auth-next').click(); await p.waitForTimeout(300);
  await shot('S01-sign-in-error');
  await tid('phone').fill('20123456'); await tid('auth-next').click();
  await tid('code').fill('1234'); await tid('auth-next').click(); await p.waitForTimeout(1200);
  await shot('S02-feed');

  await p.getByRole('link', { name: /Veste en cuir/ }).first().click(); await p.waitForTimeout(800);
  await shot('S06-item');
  await tid('buy').click(); await p.waitForTimeout(1000);
  await shot('S18-checkout');
  await tid('place-order').click(); await p.waitForTimeout(1200);
  await shot('S22-order-buyer-confirmed');

  // switch to the seller (Amira) via Profile
  const tab = async (n) => {
    for (let i = 0; i < 6 && !(await p.getByRole('tab', { name: new RegExp(n) }).isVisible()); i++) { await p.goBack(); await p.waitForTimeout(500); }
    await p.getByRole('tab', { name: new RegExp(n) }).click(); await p.waitForTimeout(700);
  };
  const back = async () => { await p.goBack(); await p.waitForTimeout(600); };
  await tab('Profil');
  await shot('S07-profile');
  await p.getByRole('button', { name: 'Amira' }).click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Mes commandes/ }).click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Ventes' }).click(); await p.waitForTimeout(400);
  await shot('S21-orders-sold');
  await p.getByRole('link').filter({ hasText: 'Veste' }).first().click(); await p.waitForTimeout(800);
  await shot('S23-order-seller-to-ship');
  await tid('ship').click(); await p.waitForTimeout(600);
  await tid('dev-delivered').click(); await p.waitForTimeout(600);
  await shot('S23-order-delivered');
  // back to the buyer (Sami): confirm
  await tab('Profil');
  await p.getByRole('button', { name: 'Sami' }).click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /Mes commandes/ }).click(); await p.waitForTimeout(800);
  await p.getByRole('link').filter({ hasText: 'Veste' }).first().click(); await p.waitForTimeout(800);
  await shot('S22-order-buyer-delivered');
  await tid('confirm').click(); await p.waitForTimeout(800);
  await shot('S22-order-completed');

  // seller balance
  await tab('Profil');
  await p.getByRole('button', { name: 'Amira' }).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /Mon solde/ }).click(); await p.waitForTimeout(700);
  const body = (await p.innerText('body')).replace(/\s+/g, ' ');
  if (!/Disponible 0,000 DT En attente 85,000 DT/.test(body)) throw new Error('seller balance wrong: ' + body.slice(0, 200));
  console.log('SELLER WALLET OK: 85,000 DT pending');
  await shot('S26-seller-balance');

  // sell form validation
  await tab('Vendre');
  await tid('publish').click(); await p.waitForTimeout(400);
  await shot('S11-sell-errors');
  await tab('Profil'); await p.getByRole('button', { name: /Système de design/ }).click(); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/design-system.png`, fullPage: true });

  console.log('CONSOLE ERRORS:', errors.length); errors.slice(0, 10).forEach((e) => console.log(' -', e.slice(0, 300)));
  await b.close();
})().catch((e) => { console.error('E2E FAILED', e.message); process.exit(1); });
