// בדיקות למודל השלבים — מריצים: npm test (node --test). שעון מזויף: ימים מועברים במפורש.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerPatch,
  applyPatch,
  buildSession,
  buildStageSizes,
  creationPace,
  dailyGoal,
  dayKey,
  daySummary,
  isKnown,
  stageProgress,
  stagesFor,
} from './stages.js';

// rng דטרמיניסטי לבדיקות
function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const answer = (words, id, correct, today) => {
  words[id] = applyPatch(words[id], answerPatch(words[id], { correct, today }));
};

test('stage sizes stay within 10–15 (one stage under 20 words)', () => {
  assert.deepEqual(buildStageSizes(150), Array(10).fill(15));
  assert.deepEqual(buildStageSizes(7), [7]);
  assert.deepEqual(buildStageSizes(17), [17]);
  assert.deepEqual(buildStageSizes(20), [10, 10]);
  assert.deepEqual(buildStageSizes(31), [11, 10, 10]);
  for (let n = 20; n <= 300; n++) {
    const sizes = buildStageSizes(n);
    assert.equal(sizes.reduce((a, b) => a + b, 0), n);
    assert.ok(sizes.every((s) => s >= 10 && s <= 15), `n=${n} → ${sizes}`);
  }
});

test('stored stagePlan is used only if it matches the word count', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `w${i}`);
  assert.deepEqual(stagesFor(ids, { sizes: [12, 18] }).map((s) => s.length), [12, 18]);
  assert.deepEqual(stagesFor(ids, { sizes: [5, 5] }).map((s) => s.length), [15, 15]); // לא תואם → מחושב
});

test('"known" = correct on 2 different days; same-day repeats do not count', () => {
  const w = {};
  answer(w, 'a', true, '2026-10-22');
  answer(w, 'a', true, '2026-10-22');
  assert.equal(isKnown(w.a), false);
  answer(w, 'a', true, '2026-10-23');
  assert.equal(isKnown(w.a), true);
});

test('a mistake on a known word sends it back to review; one later correct day restores it (no reset)', () => {
  const w = {};
  answer(w, 'a', true, '2026-10-22');
  answer(w, 'a', true, '2026-10-23');
  answer(w, 'a', false, '2026-10-24');
  assert.equal(isKnown(w.a), false);
  answer(w, 'a', true, '2026-10-24'); // אותו יום — עוד לא
  assert.equal(isKnown(w.a), false);
  answer(w, 'a', true, '2026-10-25'); // יום מאוחר יותר — ידועה שוב
  assert.equal(isKnown(w.a), true);
});

test('a mistake before the word was ever known does not block it', () => {
  const w = {};
  answer(w, 'a', false, '2026-10-22');
  answer(w, 'a', true, '2026-10-22');
  answer(w, 'a', true, '2026-10-23');
  assert.equal(isKnown(w.a), true);
});

test('Israel calendar day, not UTC', () => {
  // 22:30 UTC on 21/10 = 01:30 on 22/10 in Israel
  assert.equal(dayKey(Date.parse('2026-10-21T22:30:00Z')), '2026-10-22');
});

test('session size and stage opening', () => {
  const ids = Array.from({ length: 150 }, (_, i) => `w${i}`);
  const stages = stagesFor(ids);
  const words = {};
  const s1 = buildSession({ stages, words, today: '2026-10-22', rng: seeded() });
  assert.equal(s1.length, 15); // שלב 1 שלם, אין עדיין חזרה
  assert.ok(s1.every((x) => x.isNew && stages[0].includes(x.wordId)));
  s1.forEach((x) => answer(words, x.wordId, true, '2026-10-22'));
  assert.equal(stageProgress(stages, words).current, 1); // כל מילות שלב 1 נראו → שלב 2 נפתח
  const s2 = buildSession({ stages, words, today: '2026-10-23', rng: seeded() });
  assert.ok(s2.length >= 15 && s2.length <= 16);
  assert.equal(s2.filter((x) => !x.isNew).length, 8, 'half of the session is review');
});

test('daily goal and creation pace', () => {
  const now = Date.parse('2026-10-22T09:00:00Z');
  assert.deepEqual(dailyGoal({ totalWords: 150, seenWords: 0, now }), { sessions: 1, wordsPerDay: null, daysLeft: null });
  const due = Date.parse('2026-10-31T09:00:00Z'); // 10 ימים כולל היום
  assert.deepEqual(dailyGoal({ totalWords: 150, seenWords: 0, dueDateMs: due, now }), { sessions: 2, wordsPerDay: 15, daysLeft: 10 });
  assert.deepEqual(dailyGoal({ totalWords: 80, seenWords: 0, dueDateMs: due, now }), { sessions: 1, wordsPerDay: 8, daysLeft: 10 });
  assert.equal(creationPace(150, Date.parse('2026-10-25T09:00:00Z'), now).tooFast, true); // 4 ימים → 38 ליום
  assert.equal(creationPace(150, due, now).tooFast, false);
});

// סימולציה: משימה של 150 מילים, תלמיד אחד, 3 ימים, סבב ביום, טעות בכל מילה חמישית ביום 1
test('3-day simulation (150 words)', () => {
  const ids = Array.from({ length: 150 }, (_, i) => `w${i}`);
  const stages = stagesFor(ids);
  const words = {};
  const days = ['2026-10-22', '2026-10-23', '2026-10-24'];
  const log = [];
  days.forEach((today, d) => {
    const before = structuredClone(words);
    const session = buildSession({ stages, words, today, rng: seeded(d + 1) });
    session.forEach((x, i) => answer(words, x.wordId, !(d === 0 && i % 5 === 0), today));
    const p = stageProgress(stages, words);
    const sum = daySummary(stages, before, words, today);
    log.push({ day: d + 1, items: session.length, stage: p.current + 1, known: p.knownWords, seen: p.seenWords, tomorrow: sum.tomorrowReview });
  });
  // יום 1: 15 חדשות, אף מילה לא ידועה (צריך יום שני)
  assert.deepEqual(log[0], { day: 1, items: 15, stage: 2, known: 0, seen: 15, tomorrow: 15 });
  // יום 2: מילים משלב 1 שנענו נכון שוב → ידועות
  // יום 2: 8 חזרות — 3 מהן מילים שנענו בטעות ביום 1 (צריכות עוד 2 ימים נכונים), ו-5 נכונות שהופכות לידועות
  assert.equal(log[1].known, 5);
  assert.ok(log[2].known > log[1].known);
  assert.ok(log.every((l) => l.items <= 16));
  console.log(log);
});
