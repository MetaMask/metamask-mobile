/**
 * @jest-environment node
 */

// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'fs';

describe('PlaywrightMatchers UiAutomator regex escaping', () => {
  it('documents browser-tab pattern uses [0-9] not \\d for Android', () => {
    const source = readFileSync(`${__dirname}/PlaywrightMatchers.ts`, 'utf8');
    expect(source).toContain("replace(/\\\\d/g, '[0-9]')");
    expect(source).toContain('escapeRegexPatternForUiAutomator');
  });
});
