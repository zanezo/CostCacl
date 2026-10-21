// Run against a local static server: NODE_PATH=<Playwright packages> node tests/personal-car-share.browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
const output = process.env.TEST_ARTIFACT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'personal-car-share-'));
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      const events = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', route => {
        const body = route.request().postDataJSON();
        if (body && body.event) events.push(body.event);
        return route.fulfill({ json: { count: 123 } });
      });
      await page.goto(base);
      await page.waitForFunction(() => document.documentElement.dataset.calculatorReady === 'true');
      // Typing the decimal must not have its dot removed by live synchronization.
      await page.locator('#carPrice').fill('');
      await page.locator('#carPrice').pressSequentially('18.88');
      assert.equal(await page.locator('#carPrice').inputValue(), '18.88');
      assert.equal(await page.evaluate(() => readInputs().carPrice), 188800);
      await page.locator('#carPrice').fill('380');
      await page.locator('#mileage').fill('120000');
      assert.equal(await page.evaluate(() => readInputs().carPrice), 3800000);
      assert.equal(await page.evaluate(() => readInputs().mileage), 120000);
      assert.match(await page.locator('#carPriceNote').textContent(), /超出滑块/);
      const shareUrl = await page.evaluate(() => buildShareUrl());
      await page.goto(shareUrl);
      await page.waitForFunction(() => document.documentElement.dataset.calculatorReady === 'true');
      assert.equal(await page.locator('#carPrice').inputValue(), '380');
      assert.equal(await page.locator('#mileage').inputValue(), '120000');
      await page.locator('#imageCardBtn').click();
      await page.waitForFunction(() => !document.querySelector('.personal-export').hidden);
      assert.equal(await page.locator('#personalCardCanvas').getAttribute('data-identity'), 'explorer');
      assert.equal(await page.locator('#personalShareDialog input, #personalShareDialog textarea, #personalShareDialog select').count(), 0);
      assert.match(await page.locator('.personal-export').getAttribute('alt'), /远方探索家/);
      await page.locator('#personalShareDialog').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: path.join(output, mobile ? 'share-mobile.png' : 'share-desktop.png') });
      const downloadEvent = page.waitForEvent('download');
      await page.locator('#personalSave').click();
      const download = await downloadEvent;
      const pngPath = path.join(output, mobile ? 'card-mobile.png' : 'card-desktop.png');
      await download.saveAs(pngPath);
      const png = fs.readFileSync(pngPath);
      assert.equal(png.readUInt32BE(16), 1080);
      assert.equal(png.readUInt32BE(20), 1920);
      await page.waitForFunction(() => !!document.querySelector('.personal-export'));
      await page.locator('.personal-close').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'imageCardBtn');
      await page.locator('#mileage').fill('-1');
      assert.equal(await page.locator('#imageCardBtn').isDisabled(), true);
      assert.equal(await page.evaluate(() => readInputs().mileage), 120000);
      await page.locator('#resetBtn').click();
      assert.equal(await page.locator('#mileage').inputValue(), '12500');
      assert.equal(await page.locator('#imageCardBtn').isDisabled(), false);
      await page.locator('#mileage').fill('0');
      await page.locator('#imageCardBtn').click();
      await page.waitForFunction(() => !document.querySelector('.personal-export').hidden);
      assert.equal(await page.locator('#personalCardCanvas').getAttribute('data-identity'), 'freedom');
      await page.locator('.personal-close').click();
      await page.evaluate(() => {
        PersonalCarShare.setValue('carPrice', 0);
        ['insurance', 'parking', 'fine'].forEach(id => { document.getElementById(id).value = 0; });
        render();
      });
      assert.equal(await page.evaluate(() => calculate(readInputs()).yearTotal), 0);
      assert.ok(!/NaN|Infinity/.test(await page.locator('body').innerText()));
      await page.locator('#imageCardBtn').click();
      await page.waitForFunction(() => !document.querySelector('.personal-export').hidden);
      assert.match(await page.locator('.personal-export').getAttribute('alt'), /未计入费用/);
      await page.locator('.personal-close').click();
      await page.goto(base + '/?carPrice=18.88&mileage=12345');
      await page.waitForFunction(() => readInputs().carPrice === 188800);
      assert.equal(await page.evaluate(() => readInputs().carPrice), 188800);
      assert.equal(await page.evaluate(() => readInputs().mileage), 12345);
      await page.goto(base + '/?p=NaN&m=-1');
      await page.waitForFunction(() => document.getElementById('carPriceNote').textContent.includes('链接'));
      assert.equal(await page.locator('#carPrice').inputValue(), '15');
      assert.equal(await page.locator('#mileage').inputValue(), '12500');
      await page.screenshot({ path: path.join(output, mobile ? 'inputs-mobile.png' : 'inputs-desktop.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'no horizontal page overflow');
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('Desktop/mobile browser checks passed. Screenshots and PNGs: ' + output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
