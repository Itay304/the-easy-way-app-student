import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError, GENERIC_ERROR } from './errors.js';

const quiet = (fn) => {
  const orig = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = orig;
  }
};
const f = (code, message, online = true) => quiet(() => friendlyError({ code, message }, { online }));

test('raw "internal" is never shown', () => {
  assert.equal(f('functions/internal', 'internal'), GENERIC_ERROR);
  assert.equal(f('functions/unknown', 'INTERNAL'), GENERIC_ERROR);
  assert.equal(f(undefined, undefined), GENERIC_ERROR);
});

test('server Hebrew messages (with field names) are shown as-is', () => {
  const m = 'חסרים שדות חובה: כיתה, רשימת מילים ושם משימה.';
  assert.equal(f('functions/invalid-argument', m), m);
  assert.equal(f('functions/failed-precondition', 'המשימה בארכיון.'), 'המשימה בארכיון.');
});

test('English/technical messages are mapped by code', () => {
  assert.match(f('functions/permission-denied', 'PERMISSION_DENIED'), /אין לך הרשאה/);
  assert.match(f('functions/not-found', 'not-found'), /לא נמצאו/);
  assert.match(f('functions/invalid-argument', 'Bad Request'), /חסרים או לא תקינים/);
  assert.match(f('functions/unavailable', 'unavailable'), /אין תקשורת/);
  assert.match(f('functions/unauthenticated', 'x'), /התחברו מחדש/);
});

test('offline → network message', () => {
  assert.match(f('functions/internal', 'internal', false), /אין חיבור לאינטרנט/);
});
