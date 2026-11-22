import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJoinCode, joinErrorMessage, JOIN_MESSAGES } from './classJoin.js';

const quiet = (fn) => {
  const orig = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = orig;
  }
};
const m = (err, online = true) => quiet(() => joinErrorMessage(err, { online }));

test('normalizeJoinCode', () => {
  assert.equal(normalizeJoinCode('ab12345'), 'AB-12345');
  assert.equal(normalizeJoinCode(' gj-472c4'), 'GJ-472C4');
  assert.equal(normalizeJoinCode('demo01'), 'DEMO01');
});

test('wrong code → the requested message, under the class-code field', () => {
  const r = m({ code: 'functions/not-found', message: 'x', details: { reason: 'not-found' } });
  assert.deepEqual(r, { field: 'classCode', message: 'קוד הכיתה לא נמצא. בדקו את הקוד עם המורה ונסו שוב.' });
  // older server without details.reason
  assert.equal(
    m({ code: 'functions/not-found', message: 'קוד הכיתה לא נמצא. ודא שהקלדת אותו נכון.' }).message,
    JOIN_MESSAGES['not-found'],
  );
});

test('closed class / closed institution / rate limit — each its own message under the field', () => {
  for (const reason of ['class-closed', 'institution-closed', 'rate-limited']) {
    const r = m({ code: 'functions/failed-precondition', message: 'x', details: { reason } });
    assert.equal(r.field, 'classCode');
    assert.equal(r.message, JOIN_MESSAGES[reason]);
  }
  assert.notEqual(JOIN_MESSAGES['class-closed'], JOIN_MESSAGES['institution-closed']);
});

test('network error (offline or unavailable) → its own message', () => {
  assert.equal(m({ code: 'functions/internal', message: 'internal' }, false).message, JOIN_MESSAGES.network);
  assert.equal(m({ code: 'auth/network-request-failed' }).message, JOIN_MESSAGES.network);
  assert.equal(m({ code: 'functions/unavailable' }).field, 'form');
});

test('anything else → friendly generic, never a raw code', () => {
  const r = m({ code: 'functions/internal', message: 'internal' });
  assert.equal(r.field, 'form');
  assert.doesNotMatch(r.message, /internal/);
});

import { isCheckUnavailable } from './classJoin.js';

test('a missing check function (old server) is not "wrong code"', () => {
  const missingFn = { code: 'functions/not-found', message: 'NOT_FOUND' };
  assert.equal(isCheckUnavailable(missingFn), true);
  assert.notEqual(m(missingFn).message, JOIN_MESSAGES['not-found']);
  const wrongCode = {
    code: 'functions/not-found',
    message: 'קוד הכיתה לא נמצא. בדקו את הקוד עם המורה ונסו שוב.',
    details: { reason: 'not-found' },
  };
  assert.equal(isCheckUnavailable(wrongCode), false);
  assert.equal(isCheckUnavailable({ code: 'functions/unavailable', message: 'unavailable' }), false);
});

test('offline: a failed check is a network error, never "old server"', () => {
  assert.equal(isCheckUnavailable({ code: 'functions/internal', message: 'internal' }, { online: false }), false);
  assert.equal(m({ code: 'functions/internal', message: 'internal' }, false).message, JOIN_MESSAGES.network);
});
