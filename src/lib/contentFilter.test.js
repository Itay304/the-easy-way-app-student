// בדיקות ל"תוכן מותאם לבתי ספר דתיים" — npm test. אותם מקרים כמו functions/contentFilter.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hidesSensitive, isSensitive, visibleAssignment, visibleWords } from './contentFilter.js';
import { buildStageSizes, stageProgress, stagesFor } from './stages.js';

const word = (id, tags = 'General') => ({ id, englishWord: id, tags });
// משימה קיימת: 30 מילים, שני שלבים של 15; w3 (שלב 1) ו-w20 (שלב 2) מתויגות sensitive
const listWords = Array.from({ length: 30 }, (_, i) => word(`w${i}`, i === 3 || i === 20 ? 'General, sensitive' : 'School'));
const assignment = { assignmentId: 'a1', wordIds: listWords.map((w) => w.id), stagePlan: { sizes: buildStageSizes(30) } };

test('tag detection and the institution switch (default OFF)', () => {
  assert.equal(isSensitive(word('x', 'General, sensitive')), true);
  assert.equal(isSensitive(word('x', 'General')), false);
  assert.equal(hidesSensitive({}), false);
  assert.equal(hidesSensitive({ hideSensitiveWords: true }), true);
});

test('switch OFF: every word and the assignment are unchanged', () => {
  assert.equal(visibleWords(listWords, false).length, 30);
  assert.deepEqual(visibleAssignment(assignment, listWords, false), assignment);
});

test('switch ON: sensitive words are hidden from practice and from distractors', () => {
  const visible = visibleWords(listWords, true);
  assert.equal(visible.length, 28);
  assert.ok(visible.every((w) => !isSensitive(w)));
});

test('switch ON, existing assignment: hidden words leave wordIds and stages; stage 2 still starts at w15', () => {
  const a = visibleAssignment(assignment, listWords, true);
  assert.deepEqual(a.stagePlan.sizes, [14, 14]);
  const stages = stagesFor(a.wordIds, a.stagePlan);
  assert.equal(stages[1][0], 'w15');
  assert.ok(!stages.flat().includes('w3') && !stages.flat().includes('w20'));
});

test('switch ON: a student who saw every visible word is not stuck on a hidden one', () => {
  const a = visibleAssignment(assignment, listWords, true);
  const stages = stagesFor(a.wordIds, a.stagePlan);
  const day1 = '2026-11-14';
  const day2 = '2026-11-15';
  const words = Object.fromEntries(a.wordIds.map((id) => [id, { seen: true, n: 2, wrong: 0, correctDays: [day1, day2] }]));
  const p = stageProgress(stages, words);
  assert.equal(p.allSeen, true);
  assert.equal(p.complete, true);
  assert.equal(p.totalWords, 28);
  // without the filter the same student would be stuck: 2 words never seen
  const stuck = stageProgress(stagesFor(assignment.wordIds, assignment.stagePlan), words);
  assert.equal(stuck.complete, false);
});
