import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentSources, scopeToAssignment } from './assignmentScope.js';

const w = (sourceListId, id, englishWord) => ({ sourceListId, id, englishWord });
const pool = [w('B1', 'a', 'happy'), w('B1', 'b', 'sad'), w('B2', 'x', 'HAPPY'), w('B2', 'y', 'tall'), w('C1', 'a', 'same-id')];

test('assignmentSources: sources, or a single legacy source', () => {
  assert.deepEqual(assignmentSources({ sources: [{ listId: 'B1', listSource: 'global' }, { listId: 'C1', listSource: 'custom' }] }).length, 2);
  assert.deepEqual(assignmentSources({ listId: 'B2', listSource: 'global' }), [{ listId: 'B2', listSource: 'global' }]);
});

test('scopeToAssignment: mixed assignment — by (list, id) pair; duplicate English kept once as stored', () => {
  const a = { wordIds: ['a', 'y'], wordListIds: ['B1', 'B2'] };
  assert.deepEqual(scopeToAssignment(pool, a).map((x) => `${x.sourceListId}/${x.id}`), ['B1/a', 'B2/y']);
});

test('scopeToAssignment: same id in two lists — only the one from the stored list', () => {
  const a = { wordIds: ['a'], wordListIds: ['C1'] };
  assert.deepEqual(scopeToAssignment(pool, a).map((x) => x.englishWord), ['same-id']);
});

test('scopeToAssignment: legacy (no wordListIds) by id; no wordIds = all', () => {
  assert.equal(scopeToAssignment(pool, { wordIds: ['b'] }).length, 1);
  assert.equal(scopeToAssignment(pool, {}).length, pool.length);
});
