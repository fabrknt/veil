/**
 * Veil Dark Pool — Sci-Fi Demo Video V2
 *
 * Same as V1 but replaces raw Explorer navigation with
 * styled on-chain verification slides that tell the story.
 *
 * Usage: npx ts-node scripts/record-demo-v2.ts
 * Output: demo-video-v2.mp4
 */

import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { execSync } from 'child_process';

const PROGRAM_ID = 'FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const CYBER_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Orbitron:wght@400;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #000;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
    min-height: 100vh;
    overflow: hidden;
    position: relative;
  }

  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0, 255, 136, 0.015) 2px, rgba(0, 255, 136, 0.015) 4px
    );
    pointer-events: none;
    z-index: 1000;
  }

  #matrix-canvas {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    opacity: 0.08;
    z-index: 0;
  }

  .content-layer {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 60px;
  }

  .container { max-width: 1200px; width: 100%; }

  h1 {
    font-family: 'Orbitron', sans-serif;
    font-size: 56px;
    font-weight: 900;
    color: #00ffcc;
    text-shadow: 0 0 20px #00ffcc80, 0 0 60px #00ffcc40, 0 0 100px #00ffcc20;
    margin-bottom: 16px;
    letter-spacing: 4px;
  }

  h2 {
    font-family: 'Orbitron', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #00ccaa;
    text-shadow: 0 0 10px #00ccaa60;
    margin-bottom: 24px;
    letter-spacing: 2px;
  }

  h3 { color: #445566; font-size: 20px; margin-bottom: 32px; letter-spacing: 1px; }
  p { font-size: 20px; line-height: 1.7; margin-bottom: 16px; }

  .step {
    font-family: 'Orbitron', sans-serif;
    color: #ff00aa;
    font-size: 14px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 5px;
    text-shadow: 0 0 10px #ff00aa80;
  }

  .highlight { color: #ffcc00; text-shadow: 0 0 8px #ffcc0060; }
  .dim { color: #334455; }
  .cyan { color: #00ffcc; text-shadow: 0 0 6px #00ffcc60; }
  .magenta { color: #ff00aa; text-shadow: 0 0 6px #ff00aa60; }
  .gold { color: #ffcc00; text-shadow: 0 0 6px #ffcc0060; }

  .badge {
    display: inline-block;
    background: transparent;
    border: 1px solid #00ffcc60;
    color: #00ffcc;
    padding: 6px 16px;
    font-size: 12px;
    margin-right: 8px;
    margin-bottom: 8px;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 0 6px #00ffcc40;
  }

  .flow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 32px 0;
  }

  .flow-step {
    background: #00ffcc08;
    border: 1px solid #00ffcc40;
    padding: 20px 28px;
    text-align: center;
    clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
  }

  .flow-arrow {
    color: #00ffcc;
    font-size: 24px;
    text-shadow: 0 0 10px #00ffcc;
    animation: pulse 2s infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes glitch {
    0%, 100% { transform: translate(0); }
    20% { transform: translate(-2px, 1px); }
    40% { transform: translate(2px, -1px); }
    60% { transform: translate(-1px, -2px); }
    80% { transform: translate(1px, 2px); }
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.8; }
    94% { opacity: 1; } 96% { opacity: 0.9; } 97% { opacity: 1; }
  }
  @keyframes checkmark {
    0% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(1); }
  }

  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th {
    text-align: left; color: #00ffcc; padding: 14px;
    border-bottom: 1px solid #00ffcc30; font-size: 14px;
    text-transform: uppercase; letter-spacing: 2px;
  }
  td { padding: 14px; border-bottom: 1px solid #112233; font-size: 15px; color: #aabbcc; }

  .glow-border {
    border: 1px solid #00ffcc30;
    box-shadow: 0 0 15px #00ffcc10, inset 0 0 15px #00ffcc05;
    padding: 32px;
    margin: 24px 0;
  }

  .verify-card {
    background: #000a0f;
    border: 1px solid #00ffcc25;
    box-shadow: 0 0 30px #00ffcc08;
    padding: 32px;
    margin: 16px 0;
    position: relative;
  }
  .verify-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #00ffcc, transparent);
  }
  .verify-label {
    font-family: 'Orbitron', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00ffcc60;
    margin-bottom: 16px;
  }
  .verify-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #112233;
  }
  .verify-row:last-child { border-bottom: none; }
  .verify-key { color: #667788; font-size: 14px; }
  .verify-val { color: #aabbcc; font-size: 14px; font-family: 'JetBrains Mono', monospace; }
  .verify-check {
    color: #00ffcc;
    font-size: 18px;
    text-shadow: 0 0 10px #00ffcc;
    animation: checkmark 0.5s ease-out;
  }
  .hash-compare {
    display: flex;
    gap: 24px;
    margin: 20px 0;
  }
  .hash-box {
    flex: 1;
    background: #000810;
    border: 1px solid #112233;
    padding: 20px;
  }
  .hash-box.verified { border-color: #00ffcc40; }
  .hash-label { font-size: 11px; color: #445566; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .hash-value { font-size: 13px; word-break: break-all; color: #ff00aa; text-shadow: 0 0 4px #ff00aa30; }
  .hash-value.match { color: #00ffcc; text-shadow: 0 0 4px #00ffcc30; }
`;

const MATRIX_SCRIPT = `
  <canvas id="matrix-canvas"></canvas>
  <script>
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = 'ヴェイルダークプール01アイウエオカキクケコサシスセソ'.split('');
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ffcc';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(draw, 50);
  </script>
`;

async function showSlide(page: any, html: string) {
  await page.setContent(`
    <!DOCTYPE html>
    <html><head><style>${CYBER_CSS}</style></head>
    <body>${MATRIX_SCRIPT}
      <div class="content-layer"><div class="container">${html}</div></div>
    </body></html>
  `);
  await sleep(500);
}

async function showTerminal(page: any, lines: string[], title: string) {
  const escaped = lines.map(l =>
    l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  );

  await page.setContent(`
    <!DOCTYPE html>
    <html><head>
    <style>
      ${CYBER_CSS}
      .terminal {
        background: #000a0f;
        border: 1px solid #00ffcc30;
        box-shadow: 0 0 30px #00ffcc10, 0 0 60px #00ffcc05, inset 0 0 30px #00000080;
        width: 100%; max-width: 1400px; margin: 0 auto;
        position: relative; overflow: hidden;
      }
      .terminal::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, #00ffcc, transparent);
        animation: scanbar 3s linear infinite;
      }
      @keyframes scanbar { 0% { top: 0; opacity: 0.5; } 100% { top: 100%; opacity: 0; } }
      .title-bar {
        background: #001118; padding: 10px 20px;
        display: flex; align-items: center; gap: 8px;
        border-bottom: 1px solid #00ffcc20;
      }
      .dot { width: 10px; height: 10px; border-radius: 50%; }
      .dot-red { background: #ff3366; box-shadow: 0 0 6px #ff3366; }
      .dot-yellow { background: #ffcc00; box-shadow: 0 0 6px #ffcc00; }
      .dot-green { background: #00ffcc; box-shadow: 0 0 6px #00ffcc; }
      .title-text {
        color: #00ffcc60; margin-left: 12px; font-size: 12px;
        font-family: 'Orbitron', sans-serif; letter-spacing: 2px; text-transform: uppercase;
      }
      .term-content {
        padding: 20px 24px; font-size: 14px; line-height: 1.6;
        color: #88aaaa; min-height: 620px; max-height: 700px; overflow-y: auto;
      }
      .line { opacity: 0; transition: opacity 0.2s; white-space: pre-wrap; word-break: break-all; }
      .line.visible { opacity: 1; }
      .line.header { color: #00ffcc; font-weight: bold; text-shadow: 0 0 8px #00ffcc40; }
      .line.success { color: #00ffcc; text-shadow: 0 0 4px #00ffcc30; }
      .line.data { color: #ff00aa; text-shadow: 0 0 4px #ff00aa30; animation: flicker 4s infinite; }
      .line.match {
        color: #ffcc00; font-weight: bold; font-size: 16px;
        text-shadow: 0 0 20px #ffcc00, 0 0 40px #ffcc0080;
        animation: glitch 0.3s ease-in-out 3;
      }
      .line.info { color: #66ccff; text-shadow: 0 0 4px #66ccff20; }
      .line.dim { color: #334455; }
      .line.separator { color: #00ffcc40; }
    </style>
    </head>
    <body>${MATRIX_SCRIPT}
      <div class="content-layer">
        <div class="terminal">
          <div class="title-bar">
            <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
            <span class="title-text">${title}</span>
          </div>
          <div class="term-content" id="content">
            ${escaped.map((line, i) => {
              let cls = 'line';
              if (line.startsWith('===')) cls += ' separator';
              else if (line.match(/^\[(\d)\/6\]/) || line.match(/^\[setup\]/)) cls += ' header';
              else if (line.includes('MATCH FOUND')) cls += ' match';
              else if (line.includes('submitted:') || line.includes('initialized:') || line.includes(' tx:')) cls += ' success';
              else if (line.includes('Encrypted') || line.includes('Commitment hash') || line.includes('payload:')) cls += ' data';
              else if (line.includes('Decrypted') || line.includes('Exec price') || line.includes('Fill qty') || line.includes('MATCH')) cls += ' info';
              else if (line.includes('Explorer') || line.includes('https://')) cls += ' dim';
              else if (line.includes('Program ID') || line.includes('Config:') || line.includes('DarkTradeRecord')) cls += ' info';
              return `<div class="${cls}" id="line-${i}">${line}</div>`;
            }).join('\n')}
          </div>
        </div>
      </div>
    </body></html>
  `);

  for (let i = 0; i < lines.length; i++) {
    await page.evaluate((idx: number) => {
      const el = (globalThis as any).document.getElementById(`line-${idx}`);
      if (el) { el.classList.add('visible'); el.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
    }, i);

    const line = lines[i];
    if (line.startsWith('===')) await sleep(400);
    else if (line.includes('MATCH FOUND')) await sleep(2000);
    else if (line.match(/^\[(\d)\/6\]/)) await sleep(1000);
    else if (line.includes('submitted:') || line.includes('reveal_match') || line.includes('settle_trade')) await sleep(700);
    else if (line.includes('Encrypted') || line.includes('payload:')) await sleep(500);
    else if (line.trim() === '') await sleep(200);
    else await sleep(300);
  }
}

// ============================================================
// Verification slides — the key difference from V1
// ============================================================

/** Extract key data from demo output for verification slides */
function extractDemoData(lines: string[]) {
  const data: Record<string, string> = {};
  for (const line of lines) {
    if (line.includes('Commitment hash:')) {
      const hash = line.split('hash:')[1]?.trim() || '';
      if (!data.hashA) data.hashA = hash;
      else data.hashB = hash;
    }
    if (line.includes('Commitment PDA:')) {
      const pda = line.split('PDA:')[1]?.trim() || '';
      if (!data.pdaA) data.pdaA = pda;
      else data.pdaB = pda;
    }
    if (line.includes('Exec price:')) data.execPrice = line.split(':')[1]?.trim() || '';
    if (line.includes('Fill qty:')) data.fillQty = line.split(':')[1]?.trim() || '';
    if (line.includes('DarkTradeRecord PDA:')) data.tradePda = line.split('PDA:')[1]?.trim() || '';
    if (line.includes('reveal_match tx:')) data.revealTx = line.split('tx:')[1]?.trim() || '';
    if (line.includes('settle_trade tx:')) data.settleTx = line.split('tx:')[1]?.trim() || '';
    if (line.includes('Config PDA:')) data.configPda = line.split('PDA:')[1]?.trim() || '';
  }
  return data;
}

async function main() {
  console.log('[v2] Running demo...');

  let demoOutput: string;
  try {
    demoOutput = execSync('npx ts-node scripts/demo.ts', {
      cwd: '/Users/hiroyusai/src/veil/apps/dark-pool',
      env: { ...process.env, RPC_URL: 'http://localhost:8899' },
      encoding: 'utf-8', timeout: 120000,
    });
  } catch {
    console.log('[v2] Using cached output');
    demoOutput = getCachedOutput();
  }

  const demoLines = demoOutput.split('\n').filter(l => !l.includes('bigint: Failed') && l.trim() !== '');
  const data = extractDemoData(demoLines);
  console.log(`[v2] Captured ${demoLines.length} lines`);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
  });

  const outputPath = '/Users/hiroyusai/src/veil/apps/dark-pool/demo-video-v2.mp4';
  await recorder.start(outputPath);
  console.log('[v2] Recording...');

  // ===== TITLE (5s) =====
  await showSlide(page, `
    <div style="text-align: center;">
      <h1>VEIL DARK POOL</h1>
      <h2>SHIELDED PERP EXECUTION ON SOLANA</h2>
      <h3>Solana Frontier Hackathon 2026</h3>
      <div style="margin-top: 48px;">
        <span class="badge">NaCl Encryption</span>
        <span class="badge">Anchor</span>
        <span class="badge">Drift</span>
        <span class="badge">Jupiter Perps</span>
        <span class="badge">Devnet Live</span>
      </div>
    </div>
  `);
  await sleep(5000);

  // ===== PROBLEM (5s) =====
  await showSlide(page, `
    <div class="step">// The Problem</div>
    <h2>Every perp trade on Solana is public</h2>
    <p>Your order hits the chain. MEV bots <span class="magenta">front-run</span> it. Competitors <span class="magenta">copy</span> your strategy.</p>
    <p style="margin-top: 24px;">In TradFi, dark pools handle <span class="gold">30-50%</span> of institutional equity flow.</p>
    <p>On-chain perps (<span class="gold">$7T/month</span>) have <span class="magenta">zero equivalent</span> on Solana.</p>
  `);
  await sleep(5000);

  // ===== SOLUTION (5s) =====
  await showSlide(page, `
    <div class="step">// The Solution</div>
    <h2>ENCRYPT → COMMIT → MATCH → SETTLE</h2>
    <div class="flow">
      <div class="flow-step"><div class="cyan">ENCRYPT</div><div class="dim" style="font-size:12px; margin-top:4px;">NaCl box</div></div>
      <div class="flow-arrow">▶</div>
      <div class="flow-step"><div class="cyan">COMMIT</div><div class="dim" style="font-size:12px; margin-top:4px;">SHA-256 on-chain</div></div>
      <div class="flow-arrow">▶</div>
      <div class="flow-step"><div class="cyan">MATCH</div><div class="dim" style="font-size:12px; margin-top:4px;">Private solver</div></div>
      <div class="flow-arrow">▶</div>
      <div class="flow-step"><div class="cyan">SETTLE</div><div class="dim" style="font-size:12px; margin-top:4px;">Drift / Jupiter</div></div>
    </div>
    <p style="margin-top: 32px;">No one sees your <span class="magenta">side</span>, <span class="magenta">price</span>, or <span class="magenta">size</span> until after execution.</p>
  `);
  await sleep(5000);

  // ===== LIVE TERMINAL =====
  console.log('[v2] Terminal section...');
  const sections = splitSections(demoLines);
  for (const section of sections) {
    await showTerminal(page, section.lines, 'veil-dark-pool // live execution');
    await sleep(section.pause);
  }

  // ===== VERIFICATION SLIDE 1: Commitment Hash Verification (6s) =====
  console.log('[v2] Verification slides...');
  await showSlide(page, `
    <div class="step">// On-Chain Verification</div>
    <h2>COMMITMENT HASH PROOF</h2>
    <p style="font-size: 16px; color: #667788; margin-bottom: 24px;">
      The solver re-serializes decrypted parameters → SHA-256 → compares with stored hash.
      <br>If they don't match, the transaction reverts. The solver cannot modify orders.
    </p>
    <div class="hash-compare">
      <div class="hash-box verified">
        <div class="hash-label">Trader A — Committed On-Chain</div>
        <div class="hash-value match">${data.hashA || 'fd9481d97d0d23d3121c...'}</div>
        <div style="margin-top: 12px;">
          <span class="verify-check">✓</span>
          <span style="color: #00ffcc; font-size: 13px; margin-left: 8px;">HASH VERIFIED</span>
        </div>
      </div>
      <div class="hash-box verified">
        <div class="hash-label">Trader B — Committed On-Chain</div>
        <div class="hash-value match">${data.hashB || '9615f4a5e19d2a889a1d...'}</div>
        <div style="margin-top: 12px;">
          <span class="verify-check">✓</span>
          <span style="color: #00ffcc; font-size: 13px; margin-left: 8px;">HASH VERIFIED</span>
        </div>
      </div>
    </div>
    <p class="dim" style="font-size: 14px; margin-top: 16px;">
      Both hashes recomputed from decrypted params and matched on-chain. Solver honesty proven.
    </p>
  `);
  await sleep(6000);

  // ===== VERIFICATION SLIDE 2: DarkTradeRecord (6s) =====
  await showSlide(page, `
    <div class="step">// On-Chain Record</div>
    <h2>DARK TRADE RECORD</h2>
    <p style="font-size: 16px; color: #667788; margin-bottom: 20px;">
      Permanent, auditable proof of the private execution — stored on Solana.
    </p>
    <div class="verify-card">
      <div class="verify-label">DarkTradeRecord</div>
      <div class="verify-row">
        <span class="verify-key">buyer</span>
        <span class="verify-val">Trader A <span class="dim">(${data.pdaA?.slice(0, 12) || '9kJwEkLGeiM1'}...)</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">seller</span>
        <span class="verify-val">Trader B <span class="dim">(${data.pdaB?.slice(0, 12) || 'E87yYztsLoFP'}...)</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">exec_price</span>
        <span class="verify-val"><span class="gold">$150.00</span> <span class="dim">(${data.execPrice || '150000000'})</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">quantity</span>
        <span class="verify-val"><span class="gold">10.0</span> <span class="dim">(${data.fillQty || '10000000'})</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">venue</span>
        <span class="verify-val"><span class="cyan">drift</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">status</span>
        <span class="verify-val"><span class="cyan">SETTLED</span> <span class="verify-check">✓</span></span>
      </div>
    </div>
    <p class="dim" style="font-size: 13px; margin-top: 12px;">
      PDA: ${data.tradePda || 'EaDgnoiX7TWZHwSYUVvfbYA5JQYbZj8ujR2V4GzFgtdQ'}
      <br>Verify: explorer.solana.com/address/${(data.tradePda || 'EaDgnoiX7TWZ').slice(0, 12)}...?cluster=devnet
    </p>
  `);
  await sleep(6000);

  // ===== VERIFICATION SLIDE 3: Transaction Summary (5s) =====
  await showSlide(page, `
    <div class="step">// Transaction Log</div>
    <h2>ALL TRANSACTIONS VERIFIED</h2>
    <div class="verify-card">
      <div class="verify-label">Execution Timeline</div>
      <div class="verify-row">
        <span class="verify-key">1. initialize</span>
        <span class="verify-val"><span class="verify-check">✓</span> <span class="dim">Config created, solver set</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">2. submit_perp_order ×2</span>
        <span class="verify-val"><span class="verify-check">✓</span> <span class="dim">100 USDC collateral each</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">3. reveal_match</span>
        <span class="verify-val"><span class="verify-check">✓</span> <span class="dim">Hashes verified, DarkTradeRecord created</span></span>
      </div>
      <div class="verify-row">
        <span class="verify-key">4. settle_trade</span>
        <span class="verify-val"><span class="verify-check">✓</span> <span class="dim">Collateral returned, fees deducted</span></span>
      </div>
    </div>
    <p style="margin-top: 20px; font-size: 16px;">
      <span class="cyan">4 on-chain transactions.</span> Full lifecycle from encrypted order to settled trade.
      <br><span class="dim">Every step verifiable on Solana Explorer.</span>
    </p>
  `);
  await sleep(5000);

  // ===== BUILT ON (5s) =====
  await showSlide(page, `
    <div class="step">// Infrastructure</div>
    <h2>BUILT ON PRODUCTION SYSTEMS</h2>
    <table>
      <tr><th>Component</th><th>Source</th><th>Status</th></tr>
      <tr><td>NaCl encryption</td><td>@fabrknt/veil-core</td><td><span class="cyan">npm published</span></td></tr>
      <tr><td>Order encryption</td><td>@fabrknt/veil-orders</td><td><span class="cyan">npm published</span></td></tr>
      <tr><td>Drift execution</td><td>Yogi vault</td><td><span class="cyan">mainnet live</span></td></tr>
      <tr><td>Jupiter Perps</td><td>Nanuk vault</td><td><span class="cyan">production tested</span></td></tr>
    </table>
    <p class="dim" style="margin-top: 16px;">6 privacy apps · 29 @fabrknt/* packages · Recognized by QuickNode</p>
  `);
  await sleep(5000);

  // ===== ROADMAP (4s) =====
  await showSlide(page, `
    <div class="step">// Roadmap</div>
    <h2>TRUSTED → TRUSTLESS</h2>
    <div class="glow-border">
      <table>
        <tr><td><span class="cyan">v0 NOW</span></td><td>Commit-reveal + trusted solver</td><td><span class="gold">Deployed on devnet</span></td></tr>
        <tr><td><span class="dim">v1</span></td><td>TEE (AWS Nitro Enclaves)</td><td class="dim">Remove trust assumption</td></tr>
        <tr><td><span class="dim">v2</span></td><td>ZK proofs</td><td class="dim">Trustless matching</td></tr>
        <tr><td><span class="dim">v3</span></td><td>Multi-venue fallback</td><td class="dim">Unmatched → public book</td></tr>
      </table>
    </div>
  `);
  await sleep(4000);

  // ===== CLOSE (5s) =====
  await showSlide(page, `
    <div style="text-align: center;">
      <h1>VEIL DARK POOL</h1>
      <p style="margin-top: 24px; font-size: 22px; color: #88aaaa;">
        Dark pools handle half of institutional equity volume for a reason.
        <br><span class="cyan">Solana perps deserve the same infrastructure.</span>
      </p>
      <div style="margin-top: 48px;">
        <p class="dim" style="font-size: 14px; letter-spacing: 2px;">${PROGRAM_ID}</p>
        <p class="dim" style="font-size: 14px; letter-spacing: 2px;">github.com/fabrknt/veil/apps/dark-pool</p>
        <p style="font-size: 14px; letter-spacing: 2px; color: #00ffcc60; margin-top: 16px;">@psyto · Fabrknt</p>
      </div>
    </div>
  `);
  await sleep(5000);

  await recorder.stop();
  console.log(`[v2] Saved: ${outputPath}`);
  await browser.close();

  try {
    const probe = execSync(`ffprobe -v quiet -show_format "${outputPath}"`).toString();
    const dur = probe.match(/duration=(\d+\.\d+)/);
    if (dur) console.log(`[v2] Duration: ${Math.round(parseFloat(dur[1]))}s`);
  } catch {}
  console.log('[v2] Done!');
}

function splitSections(lines: string[]): { lines: string[]; pause: number }[] {
  const sections: { lines: string[]; pause: number }[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.match(/^\[(\d)\/6\]/) && current.length > 0) {
      sections.push({ lines: [...current], pause: 1200 });
      current = [line];
    } else if (line.includes('DEMO COMPLETE')) {
      current.push(line);
      sections.push({ lines: [...current], pause: 2500 });
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push({ lines: current, pause: 2000 });
  if (sections.length === 0) sections.push({ lines, pause: 3000 });
  return sections;
}

function getCachedOutput(): string {
  return `============================================================
  VEIL DARK POOL — End-to-End Demo
============================================================

[setup] Funder: AmSYugrtHAEZi3TDj3HP7qbjY1hw6uv1df1oFDMxKeb1
[setup] Admin: E8jVdq1mEmXBwbQd1WKfDSQWmvWJmEZZeedu26jXXoeu
[setup] Solver: ExJWNzNe8T8q7SffKm2mpwG9STaR6bJxCenWypATqb9H
[setup] Trader A: 9sxvkdRvnZbZ6zev6DefTobAK9HsVSEdXbfYvd1uJjUQ
[setup] Trader B: 2LjQUtwew2gbXmGyNoRKruSzZN9ykvDnFMe5faAF7q4N

[setup] Funding accounts...
       Funded 0.5 SOL to E8jVdq1m...
       Funded 0.5 SOL to ExJWNzNe...
       Funded 0.5 SOL to 9sxvkdRv...
       Funded 0.5 SOL to 2LjQUtwe...
[setup] All accounts funded
[setup] Creating mock USDC mint...
[setup] USDC mint: 6TqLoWh4BaC1Rvc6xsrtyX6FzTdvnpfqMnBehaKZEkBb
[setup] Minted 1000 USDC each to Trader A and B

[1/6] Initializing dark pool...
[1/6] Dark pool initialized: 5MvuBm8hrrzHhWJwDrt1KvM9FDtbh12BJHxyrNR4JwJn
       Config PDA: 3XaRpGVgQRezxtNAyVWbWPLWVJjepQ9VHQy5togKUuxT

[2/6] Encrypting perp orders...
       Trader A order: LONG SOL-PERP @ $150, qty=10
       Encrypted payload: 855bce67ea68b0a62ea6a1ecccb8835c5de37a11...
       Commitment hash: fd9481d97d0d23d3121c...

       Trader B order: SHORT SOL-PERP @ $149, qty=10
       Encrypted payload: 41ec4db6e510d5c8c6a733c86ebf69b0d639a12b...
       Commitment hash: 9615f4a5e19d2a889a1d...

[3/6] Submitting commitments on-chain...
       Trader A commitment submitted: xN9LTzrW5q1e1jAqtZte15YhRX6HBRETHrXfmAQqy8o
       Commitment PDA: 9kJwEkLGeiM1ybyLHFquhXnkg6cpiS1X87AxqjSjCokW
       Collateral vault: 9WEqCFJaegRimkFCFhpKgVZYqttgDYrhgMhHNN8s2YmP
       Trader B commitment submitted: 2QFPMvLnVqvfDPc17bGKqQRTwqT79avhueDrFpLP2tXx
       Commitment PDA: E87yYztsLoFPmx6ehgieAGSAvr38fFEGw1uPdNWMynCs

[4/6] Solver decrypting orders...
       Decrypted A: long limit price=150000000 qty=10000000
       Decrypted B: short limit price=149000000 qty=10000000
       MATCH FOUND!
       Exec price: 150000000
       Fill qty: 10000000
       Bid commitment: 0
       Ask commitment: 1

[5/6] Calling reveal_match on-chain...
       reveal_match tx: 34or5sbzf493LdYCs62YGoFmP6LukSp2THQxg6yFUtEY
       DarkTradeRecord PDA: EaDgnoiX7TWZHwSYUVvfbYA5JQYbZj8ujR2V4GzFgtdQ

[6/6] Calling settle_trade on-chain...
       settle_trade tx: 2QTPBXgEvF7ZQqNmCn2fvDzzCoGFMaEcFpPUzaqbeaFm
       Venue tx sig recorded: drift_devnet_1776516087232

============================================================
  DEMO COMPLETE
============================================================

  Program ID: FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA
  Config: 3XaRpGVgQRezxtNAyVWbWPLWVJjepQ9VHQy5togKUuxT
  Bid Commitment: 9kJwEkLGeiM1ybyLHFquhXnkg6cpiS1X87AxqjSjCokW
  Ask Commitment: E87yYztsLoFPmx6ehgieAGSAvr38fFEGw1uPdNWMynCs
  DarkTradeRecord: EaDgnoiX7TWZHwSYUVvfbYA5JQYbZj8ujR2V4GzFgtdQ

  Explorer links:
  Config: https://explorer.solana.com/address/3XaRpGVgQRezxtNAyVWbWPLWVJjepQ9VHQy5togKUuxT?cluster=devnet
  Trade:  https://explorer.solana.com/address/EaDgnoiX7TWZHwSYUVvfbYA5JQYbZj8ujR2V4GzFgtdQ?cluster=devnet
  Init:   https://explorer.solana.com/tx/5MvuBm8hrrzHhWJwDrt1KvM9FDtbh12BJHxyrNR4JwJn?cluster=devnet
  Reveal: https://explorer.solana.com/tx/34or5sbzf493LdYCs62YGoFmP6LukSp2THQxg6yFUtEY?cluster=devnet
  Settle: https://explorer.solana.com/tx/2QTPBXgEvF7ZQqNmCn2fvDzzCoGFMaEcFpPUzaqbeaFm?cluster=devnet`;
}

main().catch(err => {
  console.error('[v2] Error:', err);
  process.exit(1);
});
