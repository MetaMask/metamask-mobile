/**
 * @jest-environment node
 */

jest.mock('./AppiumGestures.ts', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn(),
    hideKeyboard: jest.fn(),
  },
}));

import { AppiumGestureStrategy } from './GestureStrategy.ts';
import AppiumGestures from './AppiumGestures.ts';
import type { AppiumElement } from './AppiumElement.ts';

describe('AppiumGestureStrategy', () => {
  const strategy = new AppiumGestureStrategy();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('taps a Playwright element via AppiumGestures.waitAndTap', async () => {
    const elem = {
      click: jest.fn(),
    } as unknown as AppiumElement;

    await strategy.tap(Promise.resolve(elem), { timeout: 1000 });

    expect(AppiumGestures.waitAndTap).toHaveBeenCalledWith(
      elem,
      expect.objectContaining({
        timeout: 1000,
        checkForDisplayed: true,
      }),
    );
  });

  it('types text and hides keyboard by default', async () => {
    const fill = jest.fn();
    const elem = { fill } as unknown as AppiumElement;

    await strategy.typeText(Promise.resolve(elem), 'hello');

    expect(fill).toHaveBeenCalledWith('hello');
    expect(AppiumGestures.hideKeyboard).toHaveBeenCalled();
  });
});
