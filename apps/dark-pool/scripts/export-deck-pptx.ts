/**
 * Export business pitch deck as PowerPoint (.pptx)
 *
 * Usage: npx ts-node scripts/export-deck-pptx.ts
 * Output: pitch-deck/business-deck.pptx
 */

const PptxGenJS = require('pptxgenjs');
const path = require('path');

// Colors matching the sci-fi theme
const BG = '000000';
const CYAN = '00FFCC';
const MAGENTA = 'FF00AA';
const GOLD = 'FFCC00';
const DIM = '445566';
const TEXT = 'C0C8D0';
const CARD_BG = '000A0F';
const CARD_BORDER = '00FFCC';

function addSlide(pres: any, builder: (slide: any) => void) {
  const slide = pres.addSlide();
  slide.background = { color: BG };
  builder(slide);
}

function main() {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pres.author = '@psyto';
  pres.title = 'Veil Dark Pool — Business Pitch';
  pres.subject = 'Shielded Perp Execution on Solana';

  // ===== SLIDE 1: Title =====
  addSlide(pres, (slide: any) => {
    slide.addText('VEIL DARK POOL', {
      x: 0, y: 1.5, w: '100%', h: 1.2,
      fontSize: 44, fontFace: 'Arial', bold: true, color: CYAN,
      align: 'center',
    });
    slide.addText('SHIELDED PERP EXECUTION ON SOLANA', {
      x: 0, y: 2.7, w: '100%', h: 0.6,
      fontSize: 20, fontFace: 'Arial', bold: true, color: '00CCAA',
      align: 'center',
    });
    slide.addText('The on-chain equivalent of what NYSE already operates.', {
      x: 0, y: 3.5, w: '100%', h: 0.5,
      fontSize: 14, fontFace: 'Arial', color: '88AAAA', align: 'center',
    });
    slide.addText('Solana Frontier Hackathon 2026', {
      x: 0, y: 4.1, w: '100%', h: 0.4,
      fontSize: 12, fontFace: 'Arial', color: DIM, align: 'center',
    });
    // Badges
    const badges = ['Live on Devnet', '80 Tests Passing', 'Production Infra'];
    badges.forEach((b, i) => {
      slide.addText(b, {
        x: 3.5 + i * 2.3, y: 5.2, w: 2.0, h: 0.4,
        fontSize: 9, fontFace: 'Courier New', color: CYAN,
        align: 'center', border: { type: 'solid', color: CYAN, pt: 0.5 },
      });
    });
    slide.addText('FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA', {
      x: 0, y: 6.5, w: '100%', h: 0.3,
      fontSize: 9, fontFace: 'Courier New', color: DIM, align: 'center',
    });
  });

  // ===== SLIDE 2: Why Now =====
  addSlide(pres, (slide: any) => {
    slide.addText('// WHY NOW', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('$7T/MONTH IN PERPS, ZERO DARK POOLS', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Stat boxes
    const stats = [
      { val: '$7T', label: 'Monthly perp volume' },
      { val: '30-50%', label: 'TradFi equity via dark pools' },
      { val: '$0', label: 'Dark pool volume on Solana' },
    ];
    stats.forEach((s, i) => {
      slide.addShape(pres.ShapeType.rect, { x: 0.8 + i * 4.0, y: 2.2, w: 3.5, h: 1.5, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
      slide.addText(s.val, { x: 0.8 + i * 4.0, y: 2.3, w: 3.5, h: 0.8, fontSize: 32, fontFace: 'Arial', bold: true, color: i === 2 ? MAGENTA : GOLD, align: 'center' });
      slide.addText(s.label, { x: 0.8 + i * 4.0, y: 3.1, w: 3.5, h: 0.5, fontSize: 9, fontFace: 'Courier New', color: DIM, align: 'center' });
    });

    slide.addText('Every large perp trade on Solana gets front-run, sandwiched, or copied.\nInstitutional capital won\'t enter until execution is private.', {
      x: 0.8, y: 4.3, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
    slide.addText('Solana now has multiple mature perp venues (Drift, Jupiter Perps, Phoenix).\nThe liquidity is here. The privacy layer is missing.', {
      x: 0.8, y: 5.3, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
  });

  // ===== SLIDE 3: Competitive Landscape =====
  addSlide(pres, (slide: any) => {
    slide.addText('// LANDSCAPE', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('NO ONE OCCUPIES THIS POSITION', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // 2x2 grid
    const quadrants = [
      { x: 0.8, y: 2.0, title: 'APP LAYER + PERPS', items: ['VEIL DARK POOL', 'Silhouette (HL only)'], highlight: true },
      { x: 7.0, y: 2.0, title: 'APP LAYER + SPOT', items: ['Flashbots Protect', 'CoW Protocol'], highlight: false },
      { x: 0.8, y: 4.5, title: 'VALIDATOR + PERPS', items: ['Jito (bundles)'], highlight: false },
      { x: 7.0, y: 4.5, title: 'VALIDATOR + TRANSFERS', items: ['Umbra (stealth addr)'], highlight: false },
    ];
    quadrants.forEach(q => {
      slide.addShape(pres.ShapeType.rect, { x: q.x, y: q.y, w: 5.5, h: 2.0, fill: { color: CARD_BG }, line: { color: '1A2530', width: 0.5, dashType: 'dash' } });
      slide.addText(q.title, { x: q.x + 0.2, y: q.y + 0.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: DIM });
      q.items.forEach((item, i) => {
        const isVeil = item === 'VEIL DARK POOL';
        slide.addText(item, {
          x: q.x + 0.3, y: q.y + 0.6 + i * 0.5, w: 4, h: 0.4,
          fontSize: isVeil ? 13 : 11, fontFace: 'Courier New', bold: isVeil,
          color: isVeil ? CYAN : '667788',
          border: isVeil ? { type: 'solid', color: CYAN, pt: 0.5 } : undefined,
        });
      });
    });

    slide.addText('Application-layer privacy for perps on Solana — the intersection no one occupies.', {
      x: 0.8, y: 6.7, w: 11, h: 0.4, fontSize: 11, fontFace: 'Arial', color: DIM,
    });
  });

  // ===== SLIDE 4: Confidentiality vs Anonymity =====
  addSlide(pres, (slide: any) => {
    slide.addText('// LEGAL CLARITY', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('CONFIDENTIALITY ≠ ANONYMITY', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Tornado Cash card
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 5.5, h: 3.0, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('TORNADO CASH', { x: 1.0, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: MAGENTA });
    const tcRows = [['Hides', 'Who (wallet identity)'], ['Duration', 'Permanent'], ['Audit trail', 'None'], ['Status', 'OFAC sanctioned']];
    tcRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 2.6 + i * 0.55, w: 2, h: 0.4, fontSize: 11, fontFace: 'Courier New', color: DIM });
      slide.addText(r[1], { x: 3.2, y: 2.6 + i * 0.55, w: 2.8, h: 0.4, fontSize: 11, fontFace: 'Courier New', color: i === 3 ? MAGENTA : TEXT });
    });

    // Veil card
    slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 2.0, w: 5.5, h: 3.0, fill: { color: CARD_BG }, line: { color: CYAN, width: 0.5 } });
    slide.addText('VEIL DARK POOL', { x: 7.2, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    const vRows = [['Hides', 'What (trade intent)'], ['Duration', 'Until execution only'], ['Audit trail', 'DarkTradeRecord on-chain'], ['Status', 'SEC-regulated in TradFi']];
    vRows.forEach((r, i) => {
      slide.addText(r[0], { x: 7.4, y: 2.6 + i * 0.55, w: 2, h: 0.4, fontSize: 11, fontFace: 'Courier New', color: DIM });
      slide.addText(r[1], { x: 9.4, y: 2.6 + i * 0.55, w: 2.8, h: 0.4, fontSize: 11, fontFace: 'Courier New', color: i === 3 ? CYAN : TEXT });
    });

    slide.addText('NYSE, NASDAQ, every major broker operates dark pools under Reg ATS.\nWe\'re bringing a regulated, proven model on-chain.', {
      x: 0.8, y: 5.5, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
  });

  // ===== SLIDE 5: Why Solana =====
  addSlide(pres, (slide: any) => {
    slide.addText('// WHY SOLANA', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('COMPOSABILITY IS THE MOAT', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Silhouette card
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 5.5, h: 3.2, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('SILHOUETTE ON HYPERLIQUID', { x: 1.0, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: MAGENTA });
    const sRows = [['Settlement', 'HyperCore only'], ['DEX options', '1 (Hyperliquid)'], ['CPI', 'None'], ['DeFi integration', 'Bridge required'], ['Funding', '$3M raised']];
    sRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 2.6 + i * 0.5, w: 2, h: 0.35, fontSize: 10, fontFace: 'Courier New', color: DIM });
      slide.addText(r[1], { x: 3.2, y: 2.6 + i * 0.5, w: 2.8, h: 0.35, fontSize: 10, fontFace: 'Courier New', color: r[1].includes('None') || r[1].includes('Bridge') ? MAGENTA : TEXT });
    });

    // Veil card
    slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 2.0, w: 5.5, h: 3.2, fill: { color: CARD_BG }, line: { color: CYAN, width: 0.5 } });
    slide.addText('VEIL ON SOLANA', { x: 7.2, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    const vRows2 = [['Settlement', 'Drift, Jupiter, Phoenix'], ['DEX options', '3+ venues'], ['CPI', 'Atomic transactions'], ['DeFi integration', 'Native (Kamino, Marginfi...)'], ['Stage', 'Devnet, seeking funding']];
    vRows2.forEach((r, i) => {
      slide.addText(r[0], { x: 7.4, y: 2.6 + i * 0.5, w: 2, h: 0.35, fontSize: 10, fontFace: 'Courier New', color: DIM });
      slide.addText(r[1], { x: 9.4, y: 2.6 + i * 0.5, w: 2.8, h: 0.35, fontSize: 10, fontFace: 'Courier New', color: CYAN });
    });

    slide.addText('Silhouette is locked to one venue. Veil settles on any Solana DEX —\ncomposability that Hyperliquid structurally cannot offer.', {
      x: 0.8, y: 5.8, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
  });

  // ===== SLIDE 6: Go-to-Market =====
  addSlide(pres, (slide: any) => {
    slide.addText('// GO-TO-MARKET', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('VAULT OPERATORS FIRST, INSTITUTIONS NEXT', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    const phases = [
      { phase: 'Phase 1', title: 'We are our own first customer', desc: 'Yogi (Drift) and Kodiak (Hyperliquid) lose money on every visible rebalance.', active: true },
      { phase: 'Phase 2', title: 'Other vault operators', desc: 'Liminal ($30M), Harmonix ($6M), Reflect, GLAM — dark pool API = 1 function call.', active: false },
      { phase: 'Phase 3', title: 'Institutional desks', desc: 'Trading firms, market makers. TEE attestation (v1) unlocks trust requirements.', active: false },
      { phase: 'Phase 4', title: 'Protocol integration', desc: 'Any Solana protocol CPIs into Veil. Distribution through composability.', active: false },
    ];
    phases.forEach((p, i) => {
      const dotColor = p.active ? CYAN : '334455';
      slide.addShape(pres.ShapeType.ellipse, { x: 1.0, y: 2.1 + i * 1.2, w: 0.2, h: 0.2, fill: { color: dotColor } });
      slide.addText(`${p.phase}: ${p.title}`, { x: 1.5, y: 2.0 + i * 1.2, w: 10, h: 0.35, fontSize: 14, fontFace: 'Arial', bold: p.active, color: p.active ? CYAN : DIM });
      slide.addText(p.desc, { x: 1.5, y: 2.35 + i * 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Arial', color: DIM });
    });
  });

  // ===== SLIDE 7: Revenue =====
  addSlide(pres, (slide: any) => {
    slide.addText('// REVENUE', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('VOLUME-BASED, NOT CAPITAL-BASED', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Revenue streams
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 11.5, h: 2.4, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('REVENUE STREAMS', { x: 1.0, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    const revRows = [
      ['Dark pool matching fees', '2-5 bps per matched trade'],
      ['Fallback routing fees', '1 bps per routed order'],
      ['Premium tiers (M-of-N threshold)', 'Institutional pricing'],
      ['API access for vault operators', 'Monthly subscription'],
    ];
    revRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 2.6 + i * 0.4, w: 6, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
      slide.addText(r[1], { x: 7.5, y: 2.6 + i * 0.4, w: 4.5, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: GOLD, align: 'right' });
    });

    // TradFi comparables
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 4.8, w: 11.5, h: 1.8, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('PROVEN IN TRADFI', { x: 1.0, y: 4.9, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    const tfRows = [
      ['IEX (dark pool exchange)', '$300M+ annual revenue'],
      ['Liquidnet (institutional dark pool)', 'Acquired for $700M'],
      ['Fee model', 'Same structure — bps on matched volume'],
    ];
    tfRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 5.4 + i * 0.4, w: 6, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
      slide.addText(r[1], { x: 7.5, y: 5.4 + i * 0.4, w: 4.5, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: CYAN, align: 'right' });
    });
  });

  // ===== SLIDE 8: Traction =====
  addSlide(pres, (slide: any) => {
    slide.addText('// TRACTION', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('NOT STARTING FROM ZERO', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Stat boxes
    const stats = [
      { val: '80', label: 'Tests passing' },
      { val: '6', label: 'Privacy apps in Veil' },
      { val: '29', label: '@fabrknt/* npm packages' },
    ];
    stats.forEach((s, i) => {
      slide.addShape(pres.ShapeType.rect, { x: 0.8 + i * 4.0, y: 2.0, w: 3.5, h: 1.2, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
      slide.addText(s.val, { x: 0.8 + i * 4.0, y: 2.0, w: 3.5, h: 0.7, fontSize: 32, fontFace: 'Arial', bold: true, color: CYAN, align: 'center' });
      slide.addText(s.label, { x: 0.8 + i * 4.0, y: 2.7, w: 3.5, h: 0.4, fontSize: 9, fontFace: 'Courier New', color: DIM, align: 'center' });
    });

    // Two cards
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 3.6, w: 5.5, h: 2.6, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('PRODUCTION VAULTS (LIVE)', { x: 1.0, y: 3.7, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    ['Yogi — Drift mainnet  ✓', 'Kodiak — Hyperliquid mainnet  ✓', 'veil-core — npm published  ✓', 'veil-orders — npm published  ✓'].forEach((r, i) => {
      slide.addText(r, { x: 1.2, y: 4.2 + i * 0.45, w: 5, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
    });

    slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 3.6, w: 5.5, h: 2.6, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('DARK POOL (DEVNET)', { x: 7.2, y: 3.7, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    ['Anchor program deployed  ✓', 'E2E lifecycle passing  ✓', 'Drift settlement wired  ✓', 'Jupiter Perps settlement wired  ✓', 'Phoenix spot settlement wired  ✓'].forEach((r, i) => {
      slide.addText(r, { x: 7.4, y: 4.2 + i * 0.45, w: 5, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
    });

    slide.addText('Built in 1 week on top of 4+ months of production infrastructure.', {
      x: 0.8, y: 6.5, w: 11, h: 0.4, fontSize: 11, fontFace: 'Arial', color: DIM,
    });
  });

  // ===== SLIDE 9: Team =====
  addSlide(pres, (slide: any) => {
    slide.addText('// TEAM', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('BUILDER WITH PRODUCTION TRACK RECORD', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 11.5, h: 3.0, fill: { color: CARD_BG }, line: { color: CYAN, width: 0.5 } });
    slide.addText('@PSYTO — SOLO FOUNDER, TOKYO', { x: 1.0, y: 2.1, w: 10, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });

    const teamRows = [
      ['Yogi', 'Funding rate vault, live on Drift mainnet'],
      ['Kodiak', 'Delta-neutral vault, live on Hyperliquid mainnet'],
      ['Veil', 'Privacy infra suite — 6 apps, npm published'],
      ['Fabrknt', '29 infrastructure packages powering all products'],
      ['Experience', 'Perps execution across Drift, Jupiter, Hyperliquid'],
    ];
    teamRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 2.6 + i * 0.45, w: 2, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: DIM });
      slide.addText(r[1], { x: 3.5, y: 2.6 + i * 0.45, w: 8, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
    });

    slide.addText('I run live perp vaults that lose money to MEV on every rebalance.\nI\'m building the dark pool because I need it myself.', {
      x: 0.8, y: 5.5, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
    slide.addText('This isn\'t a hackathon project I\'ll abandon. It\'s the flagship product\nfor an existing privacy infrastructure business.', {
      x: 0.8, y: 6.3, w: 11, h: 0.6, fontSize: 11, fontFace: 'Arial', color: DIM, lineSpacingMultiple: 1.5,
    });
  });

  // ===== SLIDE 10: Pivot =====
  addSlide(pres, (slide: any) => {
    slide.addText('// THE PIVOT', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('MENTOR FEEDBACK CHANGED EVERYTHING', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    const pivotSteps = [
      { dot: '334455', title: 'Weeks 1-2:', desc: 'Built Syntx — cross-venue perp DEX.\n5 venue adapters, 15 instructions, full frontend.', color: DIM },
      { dot: '334455', title: 'Mentor feedback:', desc: '"You\'re competing with Drift and Jupiter. You have no edge."\nUsers: "Why would I use this instead of Drift?"', color: MAGENTA },
      { dot: CYAN, title: 'Week 3:', desc: 'Pivoted to Veil Dark Pool. Combined proven privacy infra +\nproven perps execution → product the ecosystem actually needs.', color: CYAN },
    ];
    pivotSteps.forEach((p, i) => {
      slide.addShape(pres.ShapeType.ellipse, { x: 1.0, y: 2.2 + i * 1.7, w: 0.2, h: 0.2, fill: { color: p.dot } });
      slide.addText(p.title, { x: 1.5, y: 2.1 + i * 1.7, w: 10, h: 0.35, fontSize: 13, fontFace: 'Arial', color: p.color });
      slide.addText(p.desc, { x: 1.5, y: 2.5 + i * 1.7, w: 10, h: 0.7, fontSize: 11, fontFace: 'Arial', color: DIM, lineSpacingMultiple: 1.4 });
    });

    slide.addText('Built in 1 week. 80 tests. Deployed on devnet. E2E passing.', {
      x: 1.5, y: 5.5, w: 10, h: 0.4, fontSize: 13, fontFace: 'Arial', bold: true, color: GOLD,
    });
  });

  // ===== SLIDE 11: The Ask =====
  addSlide(pres, (slide: any) => {
    slide.addText('// THE ASK', { x: 0.8, y: 0.5, w: 5, h: 0.4, fontSize: 11, fontFace: 'Arial', color: MAGENTA });
    slide.addText('WHAT WE NEED TO SHIP', {
      x: 0.8, y: 1.0, w: 11, h: 0.7, fontSize: 24, fontFace: 'Arial', bold: true, color: '00CCAA',
    });

    // Needs card
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 5.5, h: 2.8, fill: { color: CARD_BG }, line: { color: '112233', width: 0.5 } });
    slide.addText('IMMEDIATE (COLOSSEUM ACCELERATOR)', { x: 1.0, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    const needRows = [['Security audit', '$50-100K'], ['TEE + QuickNode Streams (v1)', '3 months'], ['Mainnet deployment', 'Post-audit'], ['First vault integration', 'Yogi + Kodiak']];
    needRows.forEach((r, i) => {
      slide.addText(r[0], { x: 1.2, y: 2.6 + i * 0.5, w: 3, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
      slide.addText(r[1], { x: 4.0, y: 2.6 + i * 0.5, w: 2, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: GOLD, align: 'right' });
    });

    // Brings card
    slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 2.0, w: 5.5, h: 2.8, fill: { color: CARD_BG }, line: { color: CYAN, width: 0.5 } });
    slide.addText('WHAT WE BRING', { x: 7.2, y: 2.1, w: 5, h: 0.35, fontSize: 9, fontFace: 'Courier New', color: CYAN });
    ['Production privacy infra  ✓', 'Live mainnet vaults  ✓', 'Working dark pool on devnet  ✓', 'First customer (ourselves)  ✓', 'Novel primitive (first on Solana)  ✓'].forEach((r, i) => {
      slide.addText(r, { x: 7.4, y: 2.6 + i * 0.45, w: 5, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT });
    });

    slide.addText('Colosseum backs teams building the next wave of Solana infrastructure.\nDark pools are that infrastructure.', {
      x: 0.8, y: 5.5, w: 11, h: 0.8, fontSize: 14, fontFace: 'Arial', color: TEXT, lineSpacingMultiple: 1.5,
    });
  });

  // ===== SLIDE 12: Close =====
  addSlide(pres, (slide: any) => {
    slide.addText('VEIL DARK POOL', {
      x: 0, y: 1.8, w: '100%', h: 1.2,
      fontSize: 44, fontFace: 'Arial', bold: true, color: CYAN, align: 'center',
    });
    slide.addText('Dark pools handle half of institutional equity volume for a reason.\nSolana perps deserve the same infrastructure.', {
      x: 0, y: 3.2, w: '100%', h: 1.0,
      fontSize: 16, fontFace: 'Arial', color: '88AAAA', align: 'center', lineSpacingMultiple: 1.6,
    });
    slide.addText('First of its kind. Built on production systems. Ready for mainnet.', {
      x: 0, y: 4.5, w: '100%', h: 0.5,
      fontSize: 14, fontFace: 'Arial', bold: true, color: GOLD, align: 'center',
    });
    slide.addText('FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA', {
      x: 0, y: 5.5, w: '100%', h: 0.3,
      fontSize: 10, fontFace: 'Courier New', color: DIM, align: 'center',
    });
    slide.addText('github.com/fabrknt/veil', {
      x: 0, y: 5.9, w: '100%', h: 0.3,
      fontSize: 10, fontFace: 'Courier New', color: CYAN, align: 'center',
      hyperlink: { url: 'https://github.com/fabrknt/veil' },
    });
    slide.addText('@psyto · Fabrknt · Tokyo, Japan', {
      x: 0, y: 6.4, w: '100%', h: 0.3,
      fontSize: 10, fontFace: 'Courier New', color: DIM, align: 'center',
    });
  });

  // Save
  const outputPath = path.resolve(__dirname, '../pitch-deck/business-deck.pptx');
  pres.writeFile({ fileName: outputPath }).then(() => {
    console.log(`[export] Saved: ${outputPath}`);
  });
}

main();
