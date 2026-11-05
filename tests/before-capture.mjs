import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5173/';
const OUT = process.argv[3];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
const shot = (n, opts = {}) => page.screenshot({ path: `${OUT}/${n}.png`, ...opts });

// 1. Board
await shot('before-1-board', { fullPage: true });

// 2. Search "blue earbuds" -> no results; Apply button does nothing useful
await page.fill('input[placeholder="What are you looking for?"]', 'blue earbuds');
await page.click('text=Apply');
await shot('before-2-search-blue-earbuds');
await page.click('text=Clear');

// 3. "Missing items" nav: other columns show "Nothing here yet"
await page.click('.header-links >> text=Missing items');
await shot('before-3-missing-items-nav');
await page.click('.header-links >> text=Noticeboard');
await page.click('text=Clear');

// 4. Actions menu on someone else's found card (dead end)
await page.click('[aria-label="Actions for Dark backpack"]');
await page.locator('.board-column').nth(1).screenshot({ path: `${OUT}/before-4-menu-dead-end.png` });
await page.click('[aria-label="Actions for Dark backpack"]');

// 5. Duplicate report -> generic error
await page.click('.header >> text=+ Post a report');
await page.fill('input[placeholder="e.g., Black backpack"]', 'Black backpack');
await page.selectOption('.form-paper select >> nth=0', 'lost');
await page.selectOption('.form-paper select >> nth=1', 'accessories');
await page.fill('input[placeholder="Location (optional)"]', 'Library - second floor');
await page.click('text=Publish notice');
await shot('before-5-duplicate-generic-error', { fullPage: true });

// 6. Empty title -> same generic error
await page.fill('input[placeholder="e.g., Black backpack"]', 'X');
await page.click('text=Publish notice');
await page.locator('.form-paper').screenshot({ path: `${OUT}/before-6-short-title-generic-error.png` });

// 7. Found report form: no collection-point guidance
await page.fill('input[placeholder="e.g., Black backpack"]', 'Grey umbrella');
await page.selectOption('.form-paper select >> nth=0', 'found');
await page.selectOption('.form-paper select >> nth=1', 'accessories');
await page.fill('input[placeholder="Location (optional)"]', 'Building C entrance');
await page.click('text=Publish notice');
await page.locator('.board-column').nth(1).locator('.sticky').first().screenshot({ path: `${OUT}/before-7-new-found-card.png` });

await browser.close();
console.log('done');
