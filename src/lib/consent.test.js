import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsConsent, studentConsentFields, TERMS_VERSION } from './consent.js';

test('needsConsent: existing doc without termsAcceptedAt → true', () => {
  assert.equal(needsConsent(true, { role: 'student' }), true);
});

test('needsConsent: accepted → false', () => {
  assert.equal(needsConsent(true, { termsAcceptedAt: { seconds: 1 } }), false);
});

test('needsConsent: doc not created yet (mid-signup) → false', () => {
  assert.equal(needsConsent(false, undefined), false);
});

test('studentConsentFields: version, server timestamp, never marketing', () => {
  const f = studentConsentFields();
  assert.equal(f.termsVersion, TERMS_VERSION);
  assert.equal(f.marketingConsent, false);
  assert.ok(f.termsAcceptedAt, 'termsAcceptedAt is a serverTimestamp sentinel');
  assert.deepEqual(Object.keys(f).sort(), ['marketingConsent', 'termsAcceptedAt', 'termsVersion']);
});
