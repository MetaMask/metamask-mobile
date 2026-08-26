/**
 * @jest-environment node
 */

import { isSelector } from './Selector.ts';

describe('isSelector', () => {
  it('returns false for leftover Detox-shaped selector keys', () => {
    const selector = {
      detoxTestID: 'seed-phrase-input',
      appiumTestID: 'seed-phrase-input',
    };

    const result = isSelector(selector);

    expect(result).toBe(false);
  });

  it('returns true for Appium platform xpath selectors', () => {
    const selector = {
      androidAppiumTestID: 'seed-phrase-input',
      iosAppiumXPath: '//XCUIElementTypeOther[@name="textfield"]',
    };

    const result = isSelector(selector);

    expect(result).toBe(true);
  });
});
