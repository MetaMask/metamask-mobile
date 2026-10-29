/**
 * @jest-environment node
 */

// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'fs';
import AppiumMatchers from './AppiumMatchers';

describe('AppiumMatchers UiAutomator regex escaping', () => {
  it('documents browser-tab pattern uses [0-9] not \\d for Android', () => {
    const source = readFileSync(`${__dirname}/AppiumMatchers.ts`, 'utf8');
    expect(source).toContain("replace(/\\\\d/g, '[0-9]')");
    expect(source).toContain('escapeRegexPatternForUiAutomator');
  });
});

describe('AppiumMatchers.getElementByAccessibilityId', () => {
  const lazyElement = { selector: '~asset-SPAM' };

  afterEach(() => {
    delete (globalThis as { driver?: unknown }).driver;
  });

  it('returns a lazy element when the indexed accessibility id is absent', async () => {
    const dollar = jest.fn().mockResolvedValue(lazyElement);
    const dollarDollar = jest.fn().mockResolvedValue([]);
    (globalThis as { driver?: unknown }).driver = {
      $: dollar,
      $$: dollarDollar,
    };

    const result = await AppiumMatchers.getElementByAccessibilityId(
      'asset-SPAM',
      { index: 0 },
    );

    expect(dollarDollar).toHaveBeenCalledWith('~asset-SPAM');
    expect(dollar).toHaveBeenCalledWith('~asset-SPAM');
    expect(result.unwrap()).toBe(lazyElement);
  });
});
