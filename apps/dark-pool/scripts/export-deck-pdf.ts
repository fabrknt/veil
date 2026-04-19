/**
 * Export business pitch deck as PDF (one slide per page).
 *
 * Usage: npx ts-node scripts/export-deck-pdf.ts
 * Output: business-deck.pdf
 */

import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const deckPath = path.resolve(__dirname, '../pitch-deck/business.html');
  const outputPath = path.resolve(__dirname, '../pitch-deck/business-deck.pdf');

  console.log('[export] Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`file://${deckPath}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for matrix rain to render
  await sleep(3000);

  // Take screenshot of each slide and combine into PDF
  const slideCount = 12;
  const screenshots: Buffer[] = [];

  for (let i = 1; i <= slideCount; i++) {
    await page.evaluate((num: number) => {
      const el = (globalThis as any).document.getElementById(`s${num}`);
      if (el) el.scrollIntoView({ behavior: 'instant' });
    }, i);
    await sleep(500);

    const slide = await page.$(`#s${i}`);
    if (slide) {
      const screenshot = await slide.screenshot({ type: 'png' }) as Buffer;
      screenshots.push(screenshot);
      console.log(`[export] Captured slide ${i}/${slideCount}`);
    }
  }

  // Generate PDF using Puppeteer's built-in PDF with injected slide images
  const imgTags = screenshots.map(buf =>
    `<div style="page-break-after:always; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; background:#000;">
      <img src="data:image/png;base64,${buf.toString('base64')}" style="width:100%; height:100%; object-fit:contain;">
    </div>`
  ).join('\n');

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(`
    <!DOCTYPE html>
    <html><head>
      <style>
        * { margin: 0; padding: 0; }
        body { background: #000; }
        @page { size: 1920px 1080px; margin: 0; }
      </style>
    </head>
    <body>${imgTags}</body></html>
  `);

  await pdfPage.pdf({
    path: outputPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  console.log(`[export] Saved: ${outputPath}`);
  await browser.close();
  console.log('[export] Done!');
}

main().catch(err => {
  console.error('[export] Error:', err);
  process.exit(1);
});
