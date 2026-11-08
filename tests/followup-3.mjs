/**
 * Issue 3 follow-up checks. Pagination is intentionally unfinished:
 * every section label must say "page pending" until the revised PDF
 * page map arrives. This file must not be updated with guessed pages.
 *
 * Formspree is never contacted. Chrome resolves formspree.io to
 * 127.0.0.1, and every request to that host is answered locally.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'followup-3.html'), 'utf8');
const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });

const SECTIONS = [
  'Front page (page pending)',
  'The Nation (page pending)',
  'The World (page pending)',
  'Kentucky and Hometown (page pending)',
  'Business and Money (page pending)',
  'Across the Map (page pending)',
  'Cruise and Travel (page pending)',
  'Crafts (page pending)',
  'St. George and Southern Utah (page pending)',
  'Sports (page pending)',
  'This Week in History (page pending)',
  'Weather (page pending)',
  'Crossword (page pending)',
];

const FILLED = `THE WRITTEN WEEKLY: YOUR FEEDBACK ON ISSUE 3

1. Sections (this issue / future issues)
   Front page (page pending): Read it / More
      Comment: Test comment on the front page.
   The Nation (page pending): (unanswered) / (unanswered)
   The World (page pending): (unanswered) / (unanswered)
   Kentucky and Hometown (page pending): (unanswered) / (unanswered)
   Business and Money (page pending): (unanswered) / (unanswered)
   Across the Map (page pending): (unanswered) / (unanswered)
   Cruise and Travel (page pending): (unanswered) / (unanswered)
   Crafts (page pending): (unanswered) / (unanswered)
   St. George and Southern Utah (page pending): (unanswered) / (unanswered)
   Sports (page pending): (unanswered) / (unanswered)
   This Week in History (page pending): (unanswered) / (unanswered)
   Weather (page pending): (unanswered) / (unanswered)
   Crossword (page pending): Skipped it / Less
      Comment: Test comment on the crossword.

2. Enjoyed most: Front page (page pending); The Nation (page pending); Crossword (page pending)

3. Layout and print
   Type size: About right
   Length: (unanswered)
   Easy to find your way around: Yes

4. Unclear, hard to follow, or missing: Test note about clarity.

5. More, less, or other topics: (unanswered)

Thank you!`;

function waitFor(pred) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (pred()) resolve();
      else if (Date.now() - start > 5000) reject(new Error('timed out waiting for mocked request'));
      else setTimeout(tick, 20);
    };
    tick();
  });
}

function listen() {
  const pageHtml = Buffer.from(html);
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === '/followup-3.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(pageHtml);
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function staticChecks() {
  assert.equal(html.includes('(skipped)'), false, 'blank marker must not be (skipped)');
  assert.match(html, /const A=x=>x\|\|'\(unanswered\)';/);
  assert.equal(html.match(/\(page \d+\)/g), null, 'numeric pages are not allowed before the revised PDF');
  assert.doesNotMatch(html, /Weather \(page 14\)|Weather \(page 18\)|Kentucky and Hometown \(page 3\)|Kentucky and Hometown \(page 5\)/);
  assert.equal(html.includes('Issue 2'), false);
  assert.equal(html.includes('ISSUE 2'), false);
  assert.match(html, /<title>The Written Weekly: Your feedback on Issue 3<\/title>/);
  assert.match(html, /<h1>The Written Weekly: Your feedback on Issue 3<\/h1>/);
  assert.match(html, /SUBJ="The Written Weekly feedback: Issue 3"/);
  assert.match(html, /HEAD="THE WRITTEN WEEKLY: YOUR FEEDBACK ON ISSUE 3"/);
  assert.equal((html.match(/https:\/\/formspree\.io\/f\/mnppdyak/g) || []).length, 1);
  assert.match(html, /Your answers are used only to choose stories for the paper and remain private with The Written Weekly\./);
  assert.match(html, /Thank you, this information will be used in creating your next issue\./);
  assert.match(html, /It's just five questions, and all are optional\./);
  assert.match(html, />Thank you, sent\.</);
  assert.match(html, /Your answers were sent\. You can close this page\./);
  assert.match(html, /We could not send your answers\./);
  assert.match(html, /divad\.bot\+journal@mail\.grokbot\.com/);
  assert.equal((html.match(/<h2>\d+\. /g) || []).length, 5);
  assert.doesNotMatch(html, /Review answers|Print this page|reading level/i);
  assert.doesNotMatch(html, /type="email"|type="password"/);
  const cards = [...html.matchAll(/class="cn">([^<]+)/g)].map((m) => m[1]);
  const enjoyed = [...html.matchAll(/name="enj" value="([^"]+)"/g)].map((m) => m[1]);
  const sec = [...html.match(/SEC=\[(.*?)\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cards, SECTIONS);
  assert.deepEqual(enjoyed, SECTIONS);
  assert.deepEqual(sec, SECTIONS);
  assert.equal(html.includes('Crossword (page pending)'), true);
  assert.equal((html.match(/name="r_12"/g) || []).length, 4);
  assert.equal((html.match(/name="f_12"/g) || []).length, 3);
  assert.equal(html.includes('name="r_13"'), false);
  const untouched = execFileSync(
    'git',
    ['status', '--porcelain', '--', 'followup-1.html', 'followup-2.html', 'followup-amy-2.html', 'index.html', 'intake-writtenweekly.html', 'feedback-issue1-b7q2k.html'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(untouched, '', 'older pages must stay unchanged');
  console.log('static checks passed');
}

async function fill(page) {
  await page.click('input[name="r_0"][value="Read it"]');
  await page.click('input[name="r_0"][value="Skimmed it"]');
  await page.click('input[name="r_0"][value="Read it"]');
  const front = await page.$$eval('input[name="r_0"]', (els) => els.filter((e) => e.checked).map((e) => e.value));
  assert.deepEqual(front, ['Read it']);
  await page.click('input[name="f_0"][value="More"]');
  await page.click('#cb_0');
  await page.waitForSelector('#ct_0', { visible: true });
  await page.locator('#ct_0').fill('Test comment on the front page.');
  await page.click('#cb_0');
  assert.equal(await page.$eval('#cb_0', (el) => el.textContent), 'Edit comment');
  assert.equal(await page.$eval('#ct_0', (el) => el.style.display), 'none');

  await page.click('input[name="r_12"][value="Skipped it"]');
  await page.click('input[name="f_12"][value="Less"]');
  await page.click('#cb_12');
  await page.locator('#ct_12').fill('Test comment on the crossword.');

  for (const name of [
    'Front page (page pending)',
    'The Nation (page pending)',
    'Crossword (page pending)',
  ]) {
    await page.click(`input[name="enj"][value="${name}"]`);
  }
  await page.click('input[name="enj"][value="The World (page pending)"]');
  const checked = await page.$$eval('input[name="enj"]', (els) => els.filter((e) => e.checked).map((e) => e.value));
  assert.deepEqual(checked, [
    'Front page (page pending)',
    'The Nation (page pending)',
    'Crossword (page pending)',
  ]);
  assert.equal(await page.$eval('#enjmsg', (el) => el.textContent), 'Up to three. Clear one to choose another.');
  await page.click('input[name="enj"][value="The Nation (page pending)"]');
  await page.click('input[name="enj"][value="The World (page pending)"]');
  assert.equal(await page.$eval('#enjmsg', (el) => el.textContent), '');
  await page.click('input[name="enj"][value="The World (page pending)"]');
  await page.click('input[name="enj"][value="The Nation (page pending)"]');
  const restored = await page.$$eval('input[name="enj"]', (els) => els.filter((e) => e.checked).map((e) => e.value));
  assert.deepEqual(restored, [
    'Front page (page pending)',
    'The Nation (page pending)',
    'Crossword (page pending)',
  ]);

  await page.click('input[name="ts"][value="About right"]');
  await page.click('input[name="nav"][value="Yes"]');
  await page.locator('#unclear').fill('Test note about clarity.');
}

function arm(page, mode, hits, gate) {
  return page.setRequestInterception(true).then(() => {
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('formspree.io')) {
        if (req.method() === 'OPTIONS') {
          req.respond({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-methods': 'POST, OPTIONS',
              'access-control-allow-headers': 'accept, content-type',
            },
          });
          return;
        }
        hits.push({
          url,
          method: req.method(),
          headers: req.headers(),
          postData: req.postData(),
        });
        gate.promise.then(() => {
          const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
          if (mode === 'success') {
            req.respond({ status: 200, headers: cors, body: '{"ok":true}' });
          } else if (mode === 'http') {
            req.respond({ status: 422, headers: cors, body: '{"error":"mock"}' });
          } else {
            req.abort('failed');
          }
        });
        return;
      }
      if (url.startsWith(page.url().slice(0, page.url().indexOf('/followup-3.html'))) || url.startsWith('http://127.0.0.1')) {
        req.continue();
        return;
      }
      req.abort('blockedbyclient');
    });
  });
}

function assertPosted(hit) {
  assert.equal(hit.url, 'https://formspree.io/f/mnppdyak');
  assert.equal(hit.method, 'POST');
  assert.match(hit.headers.accept, /application\/json/);
  assert.match(hit.headers['content-type'], /^application\/json/);
  const body = JSON.parse(hit.postData);
  assert.deepEqual(Object.keys(body).sort(), ['_subject', 'message']);
  assert.equal(body._subject, 'The Written Weekly feedback: Issue 3');
  assert.equal(body.message, FILLED);
  assert.equal(body.message.includes('(skipped)'), false);
  assert.equal(body.message.includes('Crossword (page pending): Skipped it / Less'), true);
}

async function openPage(browser, port, mode) {
  const page = await browser.newPage();
  const hits = [];
  let release;
  const gate = { promise: new Promise((resolve) => { release = resolve; }) };
  await arm(page, mode, hits, gate);
  await page.goto(`http://127.0.0.1:${port}/followup-3.html`, { waitUntil: 'load' });
  return { page, hits, release };
}

async function run() {
  staticChecks();
  const server = await listen();
  const { port } = server.address();
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--host-resolver-rules=MAP formspree.io 127.0.0.1, MAP www.formspree.io 127.0.0.1',
    ],
  });
  try {
    const blankPage = await browser.newPage();
    await blankPage.setRequestInterception(true);
    blankPage.on('request', (req) => {
      if (req.url().includes('formspree.io')) req.abort('failed');
      else req.continue();
    });
    await blankPage.goto(`http://127.0.0.1:${port}/followup-3.html`, { waitUntil: 'load' });
    const blank = await blankPage.evaluate(() => build());
    assert.equal(blank.includes('(skipped)'), false);
    assert.equal(blank.includes('Skipped it'), false);
    assert.equal((blank.match(/\(unanswered\)/g) || []).length, 32);
    assert.match(blank, /Crossword \(page pending\): \(unanswered\) \/ \(unanswered\)/);
    await blankPage.screenshot({ path: join(shots, 'issue3_survey_top.png') });
    const crossCard = await blankPage.evaluateHandle(() => document.querySelector('#ct_12').closest('.card'));
    await crossCard.asElement().screenshot({ path: join(shots, 'issue3_crossword_section.png') });
    await blankPage.close();
    console.log('blank serialization passed');

    const ok = await openPage(browser, port, 'success');
    await fill(ok.page);
    const message = await ok.page.evaluate(() => build());
    assert.equal(message, FILLED);
    console.log('filled serialization passed');
    await ok.page.screenshot({ path: join(shots, 'issue3_filled_top.png'), fullPage: false });
    const sendPromise = ok.page.click('#sendbtn');
    await ok.page.waitForFunction(() => document.getElementById('sendbtn').textContent === 'Sending...');
    await waitFor(() => ok.hits.length === 1);
    assert.equal(ok.hits.length, 1);
    assertPosted(ok.hits[0]);
    ok.release();
    await sendPromise;
    await ok.page.waitForFunction(() => document.getElementById('okv').style.display === 'block');
    assert.equal(await ok.page.$eval('#okv h1', (el) => el.textContent), 'Thank you, sent.');
    assert.equal(await ok.page.$eval('#okv p', (el) => el.textContent), 'Your answers were sent. You can close this page.');
    assert.equal(await ok.page.$eval('#failv', (el) => el.style.display), 'none');
    assert.equal(await ok.page.$eval('#formwrap', (el) => el.style.display), 'none');
    await ok.page.screenshot({ path: join(shots, 'issue3_mock_success.png') });
    console.log('mock success passed');

    for (const mode of ['http', 'abort']) {
      const fail = await openPage(browser, port, mode);
      await fill(fail.page);
      const pending = fail.page.click('#sendbtn');
      await fail.page.waitForFunction(() => document.getElementById('sendbtn').textContent === 'Sending...');
      await waitFor(() => fail.hits.length === 1);
      assert.equal(fail.hits.length, 1);
      assertPosted(fail.hits[0]);
      fail.release();
      await pending;
      await fail.page.waitForFunction(() => document.getElementById('failv').style.display === 'block');
      assert.equal(await fail.page.$eval('#failv h1', (el) => el.textContent), 'We could not send your answers.');
      assert.equal(await fail.page.$eval('#okv', (el) => el.style.display), 'none');
      const buttons = await fail.page.$$eval('#failv button', (els) => els.map((el) => el.textContent));
      assert.deepEqual(buttons, [
        'Send by email instead (email app will open)',
        'Copy answers',
        'Back to the form',
      ]);
      const usesMailto = await fail.page.evaluate(() => document.documentElement.innerHTML.includes("location.href='mailto:'+E"));
      assert.equal(usesMailto, true);
      if (mode === 'http') await fail.page.screenshot({ path: join(shots, 'issue3_mock_failure.png') });
      await fail.page.click('button.big.sec[onclick="edit()"]');
      assert.equal(await fail.page.$eval('#formwrap', (el) => el.style.display), 'block');
      assert.equal(await fail.page.$eval('input[name="r_12"]:checked', (el) => el.value), 'Skipped it');
      console.log('mock failure', mode, 'passed');
      await fail.page.close();
    }
    assert.equal(ok.hits.length, 1, 'success path must post once');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('ALL TESTS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
