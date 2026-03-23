'use strict';
/**
 * checkAssert — evaluate a field path and apply an assertion operator.
 * Shared by cdp-bridge.js, validate-pre-conditions.js, and validate-recipe.sh.
 *
 * @param {string} raw     Raw JSON string (or plain value) returned by an eval.
 * @param {{ operator: string, field?: string, value?: unknown }} assertSpec
 * @returns {boolean}
 */
function checkAssert(raw, assertSpec) {
  if (!assertSpec) return true;
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
  // cdp-bridge.js eval prints output JSON-encoded (strings get outer quotes).
  // Unwrap one extra level so field traversal works against the real value.
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch (_) { /* keep as string */ }
  }
  let actual = parsed;
  if (assertSpec.field) {
    for (const part of assertSpec.field.split('.')) {
      if (actual == null) { actual = undefined; break; }
      actual = actual[part];
    }
  }
  const op = assertSpec.operator;
  const expected = assertSpec.value;
  if (op === 'not_null')     return actual != null;
  if (op === 'eq')           return actual === expected;
  if (op === 'neq')          return actual !== expected;
  if (op === 'gt')           return typeof actual === 'number' && actual > expected;
  if (op === 'length_eq')    return Array.isArray(actual) ? actual.length === expected : (actual != null && actual.length === expected);
  if (op === 'length_gt')    return Array.isArray(actual) ? actual.length > expected  : (actual != null && actual.length > expected);
  if (op === 'contains')     return Array.isArray(actual) ? actual.includes(expected) : (typeof actual === 'string' && actual.includes(expected));
  if (op === 'not_contains') return Array.isArray(actual) ? !actual.includes(expected) : (typeof actual !== 'string' || !actual.includes(expected));
  throw new Error('Unknown operator: ' + op);
}
module.exports = { checkAssert };
