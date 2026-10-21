// NODE_PATH must resolve Playwright. TEST_QR_DECODER optionally points to jsQR's UMD file.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8766';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const outcome of ['success', 'cancel', 'failure', 'unsupported']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.route('**/api/**', route => route.fulfill({ json: { count: 1 } }));
      await page.addInitScript(outcome => {
        window.sharedFiles = [];
        Object.defineProperty(navigator, 'canShare', { value: () => outcome !== 'unsupported' });
        Object.defineProperty(navigator, 'share', { value: async data => {
          window.sharedFiles.push({ name: data.files[0].name, type: data.files[0].type, size: data.files[0].size });
          if (outcome === 'cancel') throw new DOMException('Cancelled', 'AbortError');
          if (outcome === 'failure') throw new Error('Share failed');
        } });
      }, outcome);
      await page.goto(base + '/?m=30000');
      await page.waitForFunction(() => document.documentElement.dataset.calculatorReady === 'true');
      await page.locator('#imageCardBtn').click();
      await page.waitForFunction(() => !document.querySelector('.personal-export').hidden);
      assert.equal(await page.locator('#personalCardCanvas').getAttribute('data-identity'), 'explorer');
      if (process.env.TEST_QR_DECODER && outcome === 'success') {
        await page.addScriptTag({ path: process.env.TEST_QR_DECODER });
        for (const width of [1080, 540, 390]) {
          const destination = await page.evaluate(width => {
            const original = document.getElementById('personalCardCanvas');
            const scaled = document.createElement('canvas'); scaled.width = width; scaled.height = Math.round(width * 1920 / 1080);
            const ctx = scaled.getContext('2d'); ctx.drawImage(original, 0, 0, scaled.width, scaled.height);
            const pixels = ctx.getImageData(0, 0, scaled.width, scaled.height);
            return jsQR(pixels.data, pixels.width, pixels.height)?.data;
          }, width);
          assert.equal(destination, 'https://cost.ahopig.com/', 'QR must decode even after image resizing to ' + width);
        }
      }
      if (outcome === 'unsupported') assert.equal(await page.locator('#personalNativeShare').isVisible(), false);
      else {
        let downloads = 0; page.on('download', () => downloads++);
        await page.locator('#personalNativeShare').click();
        await page.waitForFunction(() => !document.getElementById('personalNativeShare').disabled);
        const files = await page.evaluate(() => window.sharedFiles);
        assert.equal(files[0].type, 'image/png'); assert.ok(files[0].size > 1000);
        assert.equal(downloads, 0, 'native cancellation/failure must not force a download');
        const status = await page.locator('#personalSaveStatus').textContent();
        assert.match(status, outcome === 'cancel' ? /取消/ : outcome === 'failure' ? /保存图片/ : /已经出发/);
      }
      await page.keyboard.press('Escape');
      await page.evaluate(() => { PersonalCarShare.setValue('mileage', 1000); render(); });
      await page.locator('#imageCardBtn').click();
      await page.waitForFunction(() => !document.querySelector('.personal-export').hidden);
      assert.equal(await page.locator('#personalCardCanvas').getAttribute('data-identity'), 'freedom', 'reopening must recalculate');
      await page.close();
    }
    console.log('Automatic reclassification and native file share success/cancel/failure/unsupported passed; optional QR decode passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
