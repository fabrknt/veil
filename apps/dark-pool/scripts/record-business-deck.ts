/**
 * Veil Dark Pool — Business Pitch Deck Video Recorder
 *
 * Records the business.html pitch deck as a video, auto-scrolling
 * through all 12 slides with appropriate timing for voiceover.
 *
 * Usage: npx ts-node scripts/record-business-deck.ts
 * Output: business-deck-video.mp4
 */

import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { execSync } from 'child_process';
import path from 'path';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Timing per slide in seconds (matched to voiceover script)
const SLIDE_TIMINGS = [
  10,  // Slide 1:  Title
  15,  // Slide 2:  Why Now
  15,  // Slide 3:  Landscape
  15,  // Slide 4:  Confidentiality vs Anonymity
  12,  // Slide 5:  Why Solana
  18,  // Slide 6:  Go-to-Market
  12,  // Slide 7:  Revenue
  12,  // Slide 8:  Traction
  15,  // Slide 9:  Team
  15,  // Slide 10: Pivot
  12,  // Slide 11: The Ask
  10,  // Slide 12: Close
];

async function main() {
  const deckPath = path.resolve(__dirname, '../pitch-deck/business.html');
  const outputPath = path.resolve(__dirname, '../business-deck-video.mp4');

  console.log('[recorder] Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Load the deck
  await page.goto(`file://${deckPath}`, { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('[recorder] Deck loaded');

  // Wait for matrix rain to start
  await sleep(2000);

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
  });

  await recorder.start(outputPath);
  console.log('[recorder] Recording...');

  // Record each slide
  for (let i = 0; i < SLIDE_TIMINGS.length; i++) {
    const slideNum = i + 1;
    const duration = SLIDE_TIMINGS[i];

    console.log(`[recorder] Slide ${slideNum}/12 (${duration}s)`);

    // Scroll to slide
    await page.evaluate((num: number) => {
      const el = (globalThis as any).document.getElementById(`s${num}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, slideNum);

    // Wait for scroll animation to settle
    await sleep(800);

    // Hold on slide for voiceover duration
    await sleep(duration * 1000);
  }

  // Extra 2 seconds on closing slide
  await sleep(2000);

  await recorder.stop();
  console.log(`[recorder] Saved: ${outputPath}`);

  await browser.close();

  // Print duration
  try {
    const probe = execSync(`ffprobe -v quiet -show_format "${outputPath}"`).toString();
    const dur = probe.match(/duration=(\d+\.\d+)/);
    if (dur) console.log(`[recorder] Duration: ${Math.round(parseFloat(dur[1]))}s`);
  } catch {}

  const totalPlanned = SLIDE_TIMINGS.reduce((a, b) => a + b, 0);
  console.log(`[recorder] Planned: ${totalPlanned}s + transitions`);
  console.log('[recorder] Done!');
}

main().catch(err => {
  console.error('[recorder] Error:', err);
  process.exit(1);
});
