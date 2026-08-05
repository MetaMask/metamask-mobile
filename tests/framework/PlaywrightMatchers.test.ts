/**
 * @jest-environment node
 */

// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'fs';
import { toIosPredicateMatchPattern } from './toIosPredicateMatchPattern';

describe('PlaywrightMatchers UiAutomator regex escaping', () => {
  it('documents browser-tab pattern uses [0-9] not \\d for Android', () => {
    const source = readFileSync(`${__dirname}/PlaywrightMatchers.ts`, 'utf8');
    expect(source).toContain("replace(/\\\\d/g, '[0-9]')");
    expect(source).toContain('escapeRegexPatternForUiAutomator');
  });
});

describe('toIosPredicateMatchPattern', () => {
  it('appends .* to prefix-anchored patterns so MATCHES can hit suffixed testIDs', () => {
    expect(toIosPredicateMatchPattern('^multichain-account-cell-menu-')).toBe(
      '^multichain-account-cell-menu-.*',
    );
  });

  it('wraps unanchored patterns like Android substring match', () => {
    expect(toIosPredicateMatchPattern('account-cell')).toBe('.*account-cell.*');
  });

  it('leaves end-anchored and already-wildcarded patterns alone', () => {
    expect(toIosPredicateMatchPattern('^exact-id$')).toBe('^exact-id$');
    expect(toIosPredicateMatchPattern('^menu-.*')).toBe('^menu-.*');
    expect(toIosPredicateMatchPattern('^menu-.+')).toBe('^menu-.+');
  });
});
