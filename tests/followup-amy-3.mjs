/**
 * Amy Issue 3 checks against the 18-page v5 PDF. Weather is pages 12 and 18
 * as one section. Crossword is pages 14-15 with Answers on page 16 only.
 * About on page 18 is not a rating. v5 is verified here and not published.
 * Formspree is never contacted: Chrome resolves formspree.io to 127.0.0.1
 * and every request to that host is answered locally.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'followup-amy-3.html'), 'utf8');
const shots = '/opt/cursor/artifacts';
mkdirSync(shots, { recursive: true });

const SECTIONS = [
  'Front page (page 1)',
  'The Nation and The World (page 2)',
  'Utah and St. George (page 3)',
  'Across the Map (page 6)',
  'Flight and Space (page 7)',
  'Technology and Business (page 8)',
  'Health (page 9)',
  'Dogs (page 10)',
  'Weather and Disasters (pages 12 and 18)',
  'This Week in History (pages 12–13)',
  'Crossword (pages 14–15, Answers 16)',
  'Food (page 17)',
];

const FILLED = `THE WRITTEN WEEKLY: YOUR FEEDBACK ON ISSUE 3

1. Sections (this issue / future issues)
   Front page (page 1): Read it / More
      Comment: Test comment on the front page.
   The Nation and The World (page 2): (unanswered) / (unanswered)
   Utah and St. George (page 3): (unanswered) / (unanswered)
   Across the Map (page 6): (unanswered) / (unanswered)
   Flight and Space (page 7): (unanswered) / (unanswered)
   Technology and Business (page 8): (unanswered) / (unanswered)
   Health (page 9): (unanswered) / (unanswered)
   Dogs (page 10): (unanswered) / (unanswered)
   Weather and Disasters (pages 12 and 18): (unanswered) / (unanswered)
   This Week in History (pages 12–13): (unanswered) / (unanswered)
   Crossword (pages 14–15, Answers 16): Skipped it / Less
      Comment: Test comment on the crossword.
   Food (page 17): (unanswered) / (unanswered)

2. Enjoyed most: Front page (page 1); The Nation and The World (page 2); Crossword (pages 14–15, Answers 16)

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
      if (req.url === '/followup-amy-3.html') {
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
  assert.equal(html.includes('(skipped)'), false);
  assert.match(html, /const A=x=>x\|\|'\(unanswered\)';/);
  assert.equal(html.includes('PROVISIONAL'), false);
  assert.equal(html.includes('page pending'), false);
  assert.equal(html.includes('Weather and Disasters (pages 12 and 18)'), true);
  assert.equal(html.includes('Crossword (pages 14–15, Answers 16)'), true);
  assert.equal(html.includes('About This Edition'), false);
  assert.equal((html.match(/class="cn">About/g) || []).length, 0);
  assert.equal(html.includes('Kentucky and Hometown'), false);
  assert.equal(html.includes('St. George and Southern Utah'), false);
  assert.equal(html.includes('Business and Money'), false);
  assert.equal(html.includes('Cruise and Travel'), false);
  assert.equal(html.includes('Dogs and dog sports'), false);
  assert.equal(html.includes('Food (weeknight dinners)'), false);
  assert.equal((html.match(/class="cn">Crossword/g) || []).length, 1);
  assert.equal((html.match(/class="cn">Answers/g) || []).length, 0);
  assert.doesNotMatch(html, /Review answers|Print this page|reading level/i);
  assert.doesNotMatch(html, /type="email"|type="password"/);
  assert.match(html, /<title>The Written Weekly: Your feedback on Issue 3<\/title>/);
  assert.match(html, /<h1>The Written Weekly: Your feedback on Issue 3<\/h1>/);
  assert.equal(html.includes('<h1>The Written Weekly: Your feedback on Issue 3 (Amy)</h1>'), false);
  assert.match(html, /SUBJ="The Written Weekly feedback: Issue 3 \(Amy\)"/);
  assert.match(html, /HEAD="THE WRITTEN WEEKLY: YOUR FEEDBACK ON ISSUE 3"/);
  assert.equal((html.match(/https:\/\/formspree\.io\/f\/mnppdyak/g) || []).length, 1);
  assert.match(html, /Your answers are used only to choose stories for the paper and remain private with The Written Weekly\./);
  assert.match(html, /Thank you, this information will be used in creating your next issue\./);
  assert.match(html, /It's just five questions, and all are optional\./);
  assert.match(html, />Thank you, sent\.</);
  assert.match(html, /We could not send your answers\./);
  assert.equal((html.match(/<h2>\d+\. /g) || []).length, 5);
  const cards = [...html.matchAll(/class="cn">([^<]+)/g)].map((m) => m[1]);
  const enjoyed = [...html.matchAll(/name="enj" value="([^"]+)"/g)].map((m) => m[1]);
  const sec = [...html.match(/SEC=\[(.*?)\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cards, SECTIONS);
  assert.deepEqual(enjoyed, SECTIONS);
  assert.deepEqual(sec, SECTIONS);
  assert.equal(cards.at(-1), 'Food (page 17)');
  assert.equal(cards[10], 'Crossword (pages 14–15, Answers 16)');
  assert.equal((html.match(/name="r_10"/g) || []).length, 4);
  assert.equal((html.match(/name="r_11"/g) || []).length, 4);
  assert.equal(html.includes('name="r_12"'), false);
  execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'followup-3.html', 'followup-amy-2.html', 'followup-1.html', 'followup-2.html', 'index.html', 'intake-writtenweekly.html', 'feedback-issue1-b7q2k.html', 'tests/followup-3.mjs'], { cwd: root, stdio: 'pipe' });
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

  await page.click('input[name="r_10"][value="Skipped it"]');
  await page.click('input[name="f_10"][value="Less"]');
  await page.click('#cb_10');
  await page.locator('#ct_10').fill('Test comment on the crossword.');

  for (const name of ['Front page (page 1)', 'The Nation and The World (page 2)', 'Crossword (pages 14–15, Answers 16)']) {
    await page.click(`input[name="enj"][value="${name}"]`);
  }
  await page.click('input[name="enj"][value="Utah and St. George (page 3)"]');
  const checked = await page.$$eval('input[name="enj"]', (els) => els.filter((e) => e.checked).map((e) => e.value));
  assert.deepEqual(checked, ['Front page (page 1)', 'The Nation and The World (page 2)', 'Crossword (pages 14–15, Answers 16)']);
  assert.equal(await page.$eval('#enjmsg', (el) => el.textContent), 'Up to three. Clear one to choose another.');
  await page.click('input[name="enj"][value="The Nation and The World (page 2)"]');
  await page.click('input[name="enj"][value="Utah and St. George (page 3)"]');
  assert.equal(await page.$eval('#enjmsg', (el) => el.textContent), '');
  await page.click('input[name="enj"][value="Utah and St. George (page 3)"]');
  await page.click('input[name="enj"][value="The Nation and The World (page 2)"]');
  const restored = await page.$$eval('input[name="enj"]', (els) => els.filter((e) => e.checked).map((e) => e.value));
  assert.deepEqual(restored, ['Front page (page 1)', 'The Nation and The World (page 2)', 'Crossword (pages 14–15, Answers 16)']);

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
        hits.push({ url, method: req.method(), headers: req.headers(), postData: req.postData() });
        gate.promise.then(() => {
          const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
          if (mode === 'success') req.respond({ status: 200, headers: cors, body: '{"ok":true}' });
          else if (mode === 'http') req.respond({ status: 422, headers: cors, body: '{"error":"mock"}' });
          else req.abort('failed');
        });
        return;
      }
      if (url.startsWith('http://127.0.0.1')) {
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
  assert.equal(body._subject, 'The Written Weekly feedback: Issue 3 (Amy)');
  assert.equal(body.message, FILLED);
  assert.equal(body.message.includes('(skipped)'), false);
  assert.equal(body.message.includes('Crossword (pages 14–15, Answers 16): Skipped it / Less'), true);
}

async function openPage(browser, port, mode) {
  const page = await browser.newPage();
  const hits = [];
  let release;
  const gate = { promise: new Promise((resolve) => { release = resolve; }) };
  await arm(page, mode, hits, gate);
  await page.goto(`http://127.0.0.1:${port}/followup-amy-3.html`, { waitUntil: 'load' });
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
    await blankPage.goto(`http://127.0.0.1:${port}/followup-amy-3.html`, { waitUntil: 'load' });
    const blank = await blankPage.evaluate(() => build());
    assert.equal(blank.includes('(skipped)'), false);
    assert.equal(blank.includes('Skipped it'), false);
    assert.equal((blank.match(/\(unanswered\)/g) || []).length, 30);
    assert.ok(blank.indexOf('Crossword (pages 14–15, Answers 16): (unanswered) / (unanswered)') < blank.indexOf('Food (page 17): (unanswered) / (unanswered)'));
    await blankPage.screenshot({ path: join(shots, 'amy3_v5_top.png') });
    const crossCard = await blankPage.evaluateHandle(() => document.querySelector('#ct_10').closest('.card'));
    await crossCard.asElement().screenshot({ path: join(shots, 'amy3_v5_crossword.png') });
    await blankPage.close();
    console.log('blank serialization passed');

    const ok = await openPage(browser, port, 'success');
    await fill(ok.page);
    assert.equal(await ok.page.evaluate(() => build()), FILLED);
    console.log('filled serialization passed');
    const sendPromise = ok.page.click('#sendbtn');
    await ok.page.waitForFunction(() => document.getElementById('sendbtn').textContent === 'Sending...');
    await waitFor(() => ok.hits.length === 1);
    assertPosted(ok.hits[0]);
    ok.release();
    await sendPromise;
    await ok.page.waitForFunction(() => document.getElementById('okv').style.display === 'block');
    assert.equal(await ok.page.$eval('#okv h1', (el) => el.textContent), 'Thank you, sent.');
    assert.equal(await ok.page.$eval('#okv p', (el) => el.textContent), 'Your answers were sent. You can close this page.');
    await ok.page.screenshot({ path: join(shots, 'amy3_v5_success.png') });
    console.log('mock success passed');

    for (const mode of ['http', 'abort']) {
      const fail = await openPage(browser, port, mode);
      await fill(fail.page);
      const pending = fail.page.click('#sendbtn');
      await fail.page.waitForFunction(() => document.getElementById('sendbtn').textContent === 'Sending...');
      await waitFor(() => fail.hits.length === 1);
      assertPosted(fail.hits[0]);
      fail.release();
      await pending;
      await fail.page.waitForFunction(() => document.getElementById('failv').style.display === 'block');
      assert.equal(await fail.page.$eval('#failv h1', (el) => el.textContent), 'We could not send your answers.');
      const buttons = await fail.page.$$eval('#failv button', (els) => els.map((el) => el.textContent));
      assert.deepEqual(buttons, [
        'Send by email instead (email app will open)',
        'Copy answers',
        'Back to the form',
      ]);
      if (mode === 'http') await fail.page.screenshot({ path: join(shots, 'amy3_v5_failure.png') });
      await fail.page.click('button.big.sec[onclick="edit()"]');
      assert.equal(await fail.page.$eval('#formwrap', (el) => el.style.display), 'block');
      assert.equal(await fail.page.$eval('input[name="r_10"]:checked', (el) => el.value), 'Skipped it');
      console.log('mock failure', mode, 'passed');
      await fail.page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('AMY TESTS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
