// Every screen beyond the core loop, driven like a user. Usage:
//   npm run export:web && node e2e/serve.js $PWD/dist 8099 &
//   node e2e/screens.e2e.js <out-dir> [light|dark]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2], base = 'http://localhost:8099';
const photo = path.join(__dirname, 'fixture-photo.png');
let step = 0;
const check = (cond, what) => { step++; if (!cond) throw new Error(`CHECK ${step} FAILED: ${what}`); console.log(`ok ${step} ${what}`); };

let page;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: process.argv[3] || 'light', locale: 'fr-FR' });
  const p = await ctx.newPage();
  page = p;
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  p.on('dialog', (d) => d.accept());
  const pause = (ms = 600) => p.waitForTimeout(ms);
  const shot = async (n) => { await pause(400); await p.screenshot({ path: `${out}/${n}.png` }); };
  const tid = (id) => p.getByTestId(id);
  const text = async () => (await p.innerText('body')).replace(/\s+/g, ' ');
  const tab = async (n) => {
    for (let i = 0; i < 8 && !(await p.getByRole('tab', { name: new RegExp(n) }).isVisible()); i++) { await p.goBack(); await pause(400); }
    await p.getByRole('tab', { name: new RegExp(n) }).click(); await pause();
  };
  const as = async (name) => { await tab('Profil'); await p.getByRole('button', { name, exact: true }).click(); await pause(400); };
  const button = (name) => p.getByRole('button', { name }).first();
  const upload = async (trigger) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), trigger.click()]); await fc.setFiles(photo); await pause(800); };

  // sign in as Sami
  await p.goto(base); await pause(1500);
  await tid('phone').fill('20123456'); await tid('auth-next').click();
  await tid('code').fill('1234'); await tid('auth-next').click(); await pause(1200);

  // S03/S04/S05 search + filters + S30 saved searches
  await tab('Rechercher');
  await tid('search-input').fill('veste'); await pause();
  check((await text()).includes('1 résultats') && (await text()).includes('Veste en cuir'), 'search finds the leather jacket, accent-insensitive');
  await shot('S04-search-results');
  await tid('search-input').fill(''); await tid('open-filters').click(); await pause();
  await p.getByRole('switch').first().click(); await pause(300);
  await shot('S05-filters');
  await tid('apply-filters').click(); await pause();
  check((await text()).includes('3 résultats'), 'vintage-only filter shows 3 items');
  await tid('save-search').click(); await pause();
  check((await text()).includes('Recherche enregistrée'), 'search saved');
  await tab('Accueil');
  await p.getByRole('button', { name: 'Recherches enregistrées' }).click(); await pause();
  check((await text()).includes('Vintage'), 'saved search listed');
  await shot('S30-saved-searches');

  // S09 favourites
  await tab('Accueil');
  await p.getByRole('button', { name: 'Ajouter aux favoris' }).nth(1).click(); await pause(300);
  await tab('Profil'); await button(/^Favoris/).click(); await pause();
  check((await text()).includes('Robe brodée kaftan'), 'favourite appears in Favoris');
  await shot('S09-favourites');

  // S15 chat + flagged message, S16 offer
  await tab('Accueil');
  await p.getByRole('link', { name: /vinyles/ }).first().click(); await pause();
  await tid('message-seller').click(); await pause();
  await tid('chat-input').fill('Bonjour ! Appelle-moi au 20 123 456'); await tid('chat-send').click(); await pause();
  check((await text()).includes('garde les échanges et le paiement dans l’app'), 'phone number in chat is flagged');
  await p.getByRole('button', { name: 'Faire une offre' }).first().click(); await pause();
  await tid('offer-amount').fill('20'); await tid('send-offer').click(); await pause(400);
  check((await text()).includes('Offre trop basse'), 'offer more than 40% below is refused');
  await shot('S16-offer-too-low');
  await tid('offer-amount').fill('35'); await tid('send-offer').click(); await pause();
  check((await text()).includes('Ton offre'), 'offer card shown in chat');
  await shot('S15-conversation');

  // seller accepts
  await as('Amira');
  await tab('Messages');
  check((await text()).includes('Offre en attente'), 'seller inbox shows pending offer');
  await shot('S14-inbox');
  await p.getByRole('link', { name: /sami_s/ }).first().click(); await pause();
  await tid('offer-accept').click(); await pause();
  check((await text()).includes('Offre acceptée.'), 'offer accepted');

  // buyer buys at the offer price
  await as('Sami');
  await tab('Messages');
  await p.getByRole('link', { name: /amira.vintage/ }).first().click(); await pause();
  await tid('offer-buy').click(); await pause(1200);
  check((await text()).includes('35,000 DT'), 'checkout uses the accepted offer price');
  await tid('place-order').click(); await pause(1200);
  const offerOrder = p.url();

  // seller ships, buyer gets it, confirms, reviews (S25)
  await as('Amira'); await tab('Profil'); await button(/Mes commandes/).click(); await pause();
  await button('Ventes').click(); await pause(300);
  await p.getByRole('link').filter({ hasText: 'vinyles' }).first().click(); await pause();
  await tid('ship').click(); await pause();
  await as('Sami'); await tab('Profil'); await button(/Mes commandes/).click(); await pause();
  await p.getByRole('link').filter({ hasText: 'vinyles' }).first().click(); await pause();
  await tid('dev-delivered').click(); await pause();
  await tid('confirm').click(); await pause();
  await tid('leave-review').click(); await pause();
  await tid('star-5').click(); await shot('S25-feedback');
  await tid('send-feedback').click(); await pause();
  check((await text()).includes('Ton avis : 5/5'), 'review saved on the order');

  // S07 member + S17 bundle (discount), then cancel the order
  await tab('Accueil');
  await p.getByRole('link', { name: /Théière/ }).first().click(); await pause();
  await p.getByRole('link', { name: /^amira\.vintage, / }).filter({ visible: true }).first().click(); await pause();
  await shot('S07-member');
  await button('Avis (4)').click(); await pause(300);
  check((await text()).includes('Avis automatique'), 'member reviews include automatic review');
  await shot('S08-reviews');
  await button('Acheter un lot').click(); await pause();
  const boxes = p.getByRole('checkbox');
  await boxes.nth(0).click(); await boxes.nth(1).click(); await pause(300);
  check((await text()).includes('Remise lot (-10 %)'), 'bundle discount applied at 2 items');
  await shot('S17-bundle');
  await tid('buy-bundle').click(); await pause(1200);
  check((await text()).includes('Remise lot'), 'checkout shows bundle discount');
  await tid('place-order').click(); await pause(1200);
  await tid('cancel-order').click(); await pause();
  check((await text()).includes('Commande annulée'), 'order cancelled, items back on sale');

  // S24 claim on another order
  await tab('Accueil');
  await p.getByRole('link', { name: /paille/ }).first().click(); await pause();
  await tid('buy').click(); await pause(1000); await tid('place-order').click(); await pause(1200);
  await as('Leïla'); await tab('Profil'); await button(/Mes commandes/).click(); await pause();
  await button('Ventes').click(); await pause(300);
  await p.getByRole('link').filter({ hasText: 'paille' }).first().click(); await pause();
  await tid('ship').click(); await pause(); await tid('dev-delivered').click(); await pause();
  await as('Sami'); await tab('Profil'); await button(/Mes commandes/).click(); await pause();
  await p.getByRole('link').filter({ hasText: 'paille' }).first().click(); await pause();
  await button('J’ai un problème').click(); await pause();
  await tid('reason-damaged').click(); await tid('claim-text').fill('Une anse est arrachée à la réception.');
  await upload(p.getByRole('button', { name: 'Ajouter' }));
  await shot('S24-claim');
  await tid('send-claim').click(); await pause();
  check((await text()).includes('Signalement envoyé'), 'claim sent');
  await p.goBack(); await pause();
  check((await text()).includes('Litige'), 'order shows dispute');

  // S32 report
  await tab('Accueil');
  await p.getByRole('link', { name: /Gazelle|Adidas/ }).first().click(); await pause();
  await button('Signaler l’annonce').click(); await pause();
  await p.getByRole('radio', { name: /Contrefaçon/ }).click(); await tid('send-report').click(); await pause();
  check((await text()).includes('Notre équipe va examiner'), 'report sent');
  await shot('S32-report');

  // S26/S27/S28 money: Amira has 35 DT pending from the offer order
  await as('Amira'); await tab('Profil'); await button(/Mon solde/).click(); await pause();
  check((await text()).includes('35,000 DT'), 'seller balance shows the sale');
  await tid('dev-reconcile').click(); await pause(300);
  check((await text()).includes('Identité vérifiée'), 'verified seller (seed) shows ID verified');
  await button(/Compte de retrait/).click(); await pause();
  await tid('holder').fill('Amira Trabelsi'); await tid('account-ref').fill('123');
  await tid('save-payout').click(); await pause(400);
  check((await text()).includes('Le RIB fait 20 chiffres'), 'bad RIB refused');
  await tid('account-ref').fill('12345678901234567890'); await tid('save-payout').click(); await pause(400);
  await shot('S28-settings');
  await p.goBack(); await pause();
  await shot('S26-wallet');
  await tid('withdraw').click(); await pause();
  check((await text()).includes('Retrait demandé'), 'withdrawal requested');

  // S27 ID check for an unverified member
  await as('Sami'); await tab('Profil'); await button(/Mon solde/).click(); await pause();
  check((await text()).includes('Vérifie ton identité pour pouvoir retirer'), 'unverified member is asked to verify');
  await button(/Vérifier mon identité/).click(); await pause();
  await tid('send-id').click(); await pause(300);
  check((await text()).includes('Ajoute le recto et le verso'), 'both ID photos required');
  await upload(tid('id-front')); await upload(tid('id-back'));
  await shot('S27-verify-id');
  await tid('send-id').click(); await pause();
  check((await text()).includes('Vérification en cours'), 'ID check pending');
  await tid('dev-approve').click(); await pause();
  check((await text()).includes('Identité vérifiée'), 'ID approved (demo)');

  // holiday mode hides Leïla's items; language switch
  await as('Leïla'); await tab('Profil'); await button(/Paramètres/).click(); await pause();
  await p.getByRole('switch', { name: 'Mode vacances' }).click(); await pause(300);
  await button('English').click(); await pause(300);
  await tab('Home');
  const home = await text();
  check(!home.includes('Robe brodée') && home.includes('Fresh finds'), 'holiday mode hides items; English UI');

  console.log('CONSOLE ERRORS:', errors.length); errors.slice(0, 10).forEach((e) => console.log(' -', e.slice(0, 300)));
  await b.close();
  if (errors.length) process.exit(2);
})().catch(async (e) => {
  console.error('E2E FAILED', e.message.split('\n')[0]);
  if (page) { console.error('at', page.url()); await page.screenshot({ path: `${out}/_failure.png` }).catch(() => {}); }
  process.exit(1);
});
