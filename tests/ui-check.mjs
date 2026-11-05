// End-to-end UI check + screenshot capture (used for the after-*.png files).
// Run with the dev server up:  npm i -D playwright-core  then
//   node tests/ui-check.mjs http://localhost:5173/ screenshots
// Uses the locally installed Chrome; change executablePath if yours differs.

import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const URL = process.argv[2] || 'http://localhost:5173/';
const OUT = process.argv[3];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(e.message));
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
page.on('dialog', d => d.accept());
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
const shot = (n, opts = {}) => page.screenshot({ path: `${OUT}/${n}.png`, ...opts });
const cards = () => page.locator('.sticky h3').allTextContents();
const ok = m => console.log('PASS', m);

await shot('after-1-board', { fullPage: true });
assert.equal((await cards()).length, 13); ok('board shows 13 reports');

// Search: words in any order
await page.fill('input[type=search]', 'blue earbuds');
assert.deepEqual((await cards()).sort(), ['Earbuds in blue case', 'Wireless earbuds']);
assert.match(await page.textContent('.filter-result'), /Showing 2 of 13/);
await shot('after-2-search-blue-earbuds'); ok('"blue earbuds" finds both earbud reports');
await page.fill('input[type=search]', 'security desk');
assert.deepEqual((await cards()).sort(), ['Dark backpack', 'Metal water bottle']); ok('search covers collection points');

// No-result state
await page.fill('input[type=search]', 'umbrella');
assert.ok(await page.isVisible('.empty-state'));
await shot('after-3-no-results'); ok('empty state shown');
await page.click('.filter-result >> text=Clear filters');
assert.equal((await cards()).length, 13);

// Header views
await page.click('.header-links >> text=Missing items');
assert.equal(await page.locator('.board-column').count(), 1);
assert.equal(await page.getAttribute('.header-links >> text=Missing items', 'aria-current'), 'page');
assert.equal((await cards()).length, 6);
await shot('after-4-missing-items-view'); ok('Missing items shows only lost column, marked current');
await page.click('.header-links >> text=Noticeboard');

// Possible matches from own lost report
const bp = page.locator('.sticky', { hasText: 'Black backpack' });
assert.match(await bp.textContent(), /Your report/);
await bp.locator('.match-link').click();
assert.deepEqual(await cards(), ['Dark backpack']);
assert.match(await page.textContent('.handover-note'), /Held at Campus Security Desk/);
await shot('after-5-possible-matches'); ok('possible matches for Black backpack -> Dark backpack, held at desk');
await page.click('.match-banner button');
assert.equal((await cards()).length, 13);

// Other users' cards have no edit; dead-end menu is gone
assert.equal(await page.locator('.sticky', { hasText: 'Dark backpack' }).locator('.edit-button').count(), 0);
assert.equal(await page.locator('.edit-button').count(), 3); ok('only own 3 reports are editable');
await page.locator('.board-grid').screenshot({ path: `${OUT}/after-6-cards-status-and-actions.png` });

// Unsuccessful action 1: empty submit
await page.click('.header >> text=+ Post a report');
await page.click('text=Publish notice');
const errs = await page.locator('.field-error').allTextContents();
assert.equal(errs.length, 3);
assert.equal(await page.evaluate(() => document.activeElement.id), 'field-status');
await page.locator('.form-paper').screenshot({ path: `${OUT}/after-7-empty-submit-errors.png` }); ok('empty submit -> 3 inline errors, focus on first');

// Unsuccessful action 2: short title & duplicate
await page.check('input[value=lost]');
assert.equal(await page.locator('.field-error').count(), 2); ok('error clears when field fixed');
await page.fill('#field-title', 'X');
await page.selectOption('#field-category', 'accessories');
await page.click('text=Publish notice');
assert.deepEqual(await page.locator('.field-error').allTextContents(), ['Title must be at least 2 characters.']); ok('short title rejected with specific message');
await page.fill('#field-title', 'black backpack');
await page.fill('#field-location', ' Library - second floor ');
await page.click('text=Publish notice');
assert.match(await page.textContent('#err-title'), /same title has already been reported at this location/);
assert.ok(await page.isVisible('.dup-help'));
await page.locator('.form-paper').screenshot({ path: `${OUT}/after-8-duplicate-error.png` }); ok('duplicate rejected (case/whitespace-insensitive) with link to existing');
await page.click('.dup-help button');
assert.deepEqual(await cards(), ['Black backpack']); ok('duplicate link opens existing report');

// Main action A: report a found item handed in at a collection point
await page.click('.header >> text=+ Post a report');
await page.check('input[value=found]');
assert.match(await page.textContent('.form-paper'), /Where did you find it\?/);
await page.fill('#field-title', 'Grey umbrella');
await page.selectOption('#field-category', 'accessories');
await page.fill('#field-location', 'Building C entrance');
await page.selectOption('#field-handedInAt', 'Library Reception');
await page.fill('#field-description', 'Folding grey umbrella with a wooden handle.');
await page.locator('.form-paper').screenshot({ path: `${OUT}/after-9-found-form.png` });
await page.click('text=Publish notice');
assert.match(await page.textContent('.message'), /Your report has been posted/);
const um = page.locator('.sticky', { hasText: 'Grey umbrella' });
assert.match(await um.textContent(), /Finder says it was handed in at Library Reception.*Awaiting staff confirmation/s);
await um.screenshot({ path: `${OUT}/after-10-new-found-card.png` }); ok('found report posted, shown as unconfirmed hand-in');
let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('acl-foundboard-v3'))[0]);
assert.equal(stored.handoverStatus, 'reported'); assert.equal(stored.collectionPoint, ''); ok('not marked as received by staff');

// Main action B: report a lost item -> matches suggested
await page.click('.header >> text=+ Post a report');
await page.check('input[value=lost]');
await page.fill('#field-title', 'Flash drive');
await page.selectOption('#field-category', 'electronics');
await page.fill('#field-location', 'Building A');
await page.fill('#field-description', 'Small black USB drive with my thesis on it.');
await page.click('text=Publish notice');
assert.match(await page.textContent('.message'), /1 found report may match it/);
await shot('after-11-lost-posted-with-match'); ok('lost report posted, match suggested');
await page.click('.message >> text=View possible matches');
assert.deepEqual(await cards(), ['USB flash drive']);
assert.match(await page.textContent('.handover-note'), /Not at a collection point yet/); ok('match is USB flash drive, honest "not at collection point"');
await page.click('.match-banner button');

// Edit own staff-confirmed found report keeps handover status
await page.locator('.sticky', { hasText: 'Calculator' }).filter({ hasText: 'B2 study area' }).locator('.edit-button').click();
assert.match(await page.textContent('.collection-box'), /Staff confirmed: held at Library Reception/);
await page.locator('.form-paper').screenshot({ path: `${OUT}/after-12-edit-confirmed.png` });
await page.fill('#field-description', 'Scientific calculator with a black cover, found on a desk near the window.');
await page.click('text=Save report');
assert.match(await page.textContent('.message'), /Report updated/);
stored = await page.evaluate(() => JSON.parse(localStorage.getItem('acl-foundboard-v3')).find(x => x.id === 'f11'));
assert.equal(stored.handoverStatus, 'received'); assert.equal(stored.collectionPoint, 'Library Reception');
assert.match(stored.description, /near the window/); ok('edit saved, staff handover preserved');

// Edit -> duplicate of another report rejected
await page.locator('.sticky', { hasText: 'Grey umbrella' }).locator('.edit-button').click();
await page.fill('#field-title', 'Calculator'); await page.fill('#field-location', 'B2 study area');
await page.click('text=Save report');
assert.ok(await page.isVisible('#err-title')); ok('edit into duplicate rejected');
await page.click('text=Cancel');

// Persistence and reset
await page.reload();
assert.equal((await cards()).length, 15); ok('reports persist after reload');
await page.click('text=Reset demo data');
assert.equal((await cards()).length, 13); ok('reset restores examples');

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await shot('after-13-mobile', { fullPage: false });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert.equal(overflow, false); ok('no horizontal scroll at 390px');
await page.click('.header >> text=+ Post a report');
await page.click('text=Publish notice');
await shot('after-14-mobile-form-errors');

assert.deepEqual(consoleErrors, []); ok('no console errors');
await browser.close();
console.log('ALL TESTS PASSED');
