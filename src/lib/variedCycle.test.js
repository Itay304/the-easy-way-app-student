// בדיקות למחזור התרגול המגוון — npm test (node --test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleForIndex, exerciseFor, isPhrase } from './variedCycle.js';

test('cycle: 5 words per module, flashcards → quiz → true/false → spelling', () => {
  assert.deepEqual([0, 4, 5, 10, 15, 19, 20].map(moduleForIndex), ['flashcards', 'flashcards', 'quiz', 'truefalse', 'spelling', 'spelling', 'flashcards']);
});

test('phrases skip the spelling step (like SpellingModule) and get a quiz instead', () => {
  const phrase = { englishWord: 'by the way', partOfSpeech: 'phrase' };
  const word = { englishWord: 'absent', partOfSpeech: 'adj' };
  assert.equal(exerciseFor(phrase, 15), 'quiz');
  assert.equal(exerciseFor(word, 15), 'spelling');
  // other steps are unchanged for phrases
  assert.equal(exerciseFor(phrase, 0), 'flashcards');
  assert.equal(exerciseFor(phrase, 10), 'truefalse');
});

test('isPhrase matches the SpellingModule rule (case/space-insensitive, only "phrase")', () => {
  assert.equal(isPhrase({ partOfSpeech: ' Phrase ' }), true);
  assert.equal(isPhrase({ partOfSpeech: 'phrasal verb' }), false);
  assert.equal(isPhrase({ partOfSpeech: '' }), false);
  assert.equal(isPhrase({}), false);
});
