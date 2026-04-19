/**
 * Export business pitch deck as PowerPoint with image slides.
 * Each slide is a full screenshot of the HTML deck — preserves
 * matrix rain, neon glow, scanlines, all visual effects.
 *
 * Usage: npx ts-node scripts/export-deck-pptx-images.ts
 * Output: pitch-deck/business-deck-visual.pptx
 */

import puppeteer from 'puppeteer';
import path from 'path';

const PptxGenJS = require('pptxgenjs');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const deckPath = path.resolve(__dirname, '../pitch-deck/business.html');
  const outputPath = path.resolve(__dirname, '../pitch-deck/business-deck-visual.pptx');
  const slideCount = 12;

  console.log('[export] Launching browser...');
  // Use smaller viewport so content renders larger relative to slide
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`file://${deckPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Tighten layout: reduce padding, hide chrome, boost font sizes
  await page.evaluate(() => {
    const doc = (globalThis as any).document;

    // Reduce padding so content fills the slide
    doc.querySelectorAll('.slide').forEach((s: any) => {
      s.style.padding = '24px 36px';
    });

    // Hide nav dots and slide numbers
    const nav = doc.getElementById('nav');
    if (nav) nav.style.display = 'none';
    doc.querySelectorAll('.slide-num').forEach((n: any) => {
      n.style.display = 'none';
    });

    // Remove max-width constraint so content stretches wider
    doc.querySelectorAll('.slide-inner').forEach((s: any) => {
      s.style.maxWidth = '100%';
    });
  });

  // Wait for matrix rain to render
  await sleep(3000);

  // Capture each slide as PNG
  const screenshots: string[] = []; // base64 encoded

  for (let i = 1; i <= slideCount; i++) {
    await page.evaluate((num: number) => {
      const el = (globalThis as any).document.getElementById(`s${num}`);
      if (el) el.scrollIntoView({ behavior: 'instant' });
    }, i);
    await sleep(800);

    const slide = await page.$(`#s${i}`);
    if (slide) {
      const buf = await slide.screenshot({ type: 'png' }) as Buffer;
      screenshots.push(buf.toString('base64'));
      console.log(`[export] Captured slide ${i}/${slideCount}`);
    }
  }

  await browser.close();

  // Build PPTX with image slides
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pres.author = '@psyto';
  pres.title = 'Veil Dark Pool — Business Pitch';

  for (let i = 0; i < screenshots.length; i++) {
    const slide = pres.addSlide();
    slide.background = { color: '000000' };
    slide.addImage({
      data: `image/png;base64,${screenshots[i]}`,
      x: 0, y: 0, w: '100%', h: '100%',
    });
  }

  await pres.writeFile({ fileName: outputPath });
  console.log(`[export] Saved: ${outputPath}`);
  console.log('[export] Done!');
}

main().catch(err => {
  console.error('[export] Error:', err);
  process.exit(1);
});
