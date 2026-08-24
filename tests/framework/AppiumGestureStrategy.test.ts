/**
 * @jest-environment node
 */

jest.mock('./AppiumGestures.ts', () => ({
  __esModule: true,
  default: {
    dblTap: jest.fn(),
    hideKeyboard: jest.fn(),
    waitAndTap: jest.fn(),
  },
}));

import AppiumGestures from './AppiumGestures.ts';
import { AppiumGestureStrategy } from './GestureStrategy.ts';
import type { AppiumElement } from './AppiumElement.ts';

describe('AppiumGestureStrategy', () => {
  const strategy = new AppiumGestureStrategy();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates dblTap to AppiumGestures with the resolved element', async () => {
    const resolved = { unwrap: jest.fn() } as unknown as AppiumElement;

    await strategy.dblTap(Promise.resolve(resolved));

    expect(AppiumGestures.dblTap).toHaveBeenCalledWith(resolved);
  });

  it('clicks indexed element when AppiumElement array is provided', async () => {
    const first = { click: jest.fn() } as unknown as AppiumElement;
    const second = { click: jest.fn() } as unknown as AppiumElement;
    const third = { click: jest.fn() } as unknown as AppiumElement;

    await strategy.tapAtIndex([first, second, third], 2);

    expect(third.click).toHaveBeenCalledTimes(1);
    expect(second.click).not.toHaveBeenCalled();
    expect(first.click).not.toHaveBeenCalled();
  });

  it('throws when array index is out of bounds', async () => {
    const only = { click: jest.fn() } as unknown as AppiumElement;

    await expect(strategy.tapAtIndex([only], 2)).rejects.toThrow(
      'tapAtIndex: index 2 is out of bounds (1 elements)',
    );
  });

  it('throws for single element when index is greater than zero', async () => {
    const elem = Promise.resolve({
      click: jest.fn(),
    } as unknown as AppiumElement);

    await expect(strategy.tapAtIndex(elem, 2)).rejects.toThrow(
      'tapAtIndex: Appium requires a AppiumElement[] array for index > 0.',
    );
  });

  it('uses single element pass-through when index is zero', async () => {
    const resolved = { click: jest.fn() } as unknown as AppiumElement;

    await strategy.tapAtIndex(Promise.resolve(resolved), 0);

    expect(resolved.click).toHaveBeenCalledTimes(1);
  });

  it('fills text and hides keyboard by default', async () => {
    const resolved = {
      fill: jest.fn(),
    } as unknown as AppiumElement;

    await strategy.typeText(Promise.resolve(resolved), 'hello');

    expect(resolved.fill).toHaveBeenCalledWith('hello');
    expect(AppiumGestures.hideKeyboard).toHaveBeenCalledTimes(1);
  });

  it('skips hideKeyboard when hideKeyboard is false', async () => {
    const resolved = {
      fill: jest.fn(),
    } as unknown as AppiumElement;

    await strategy.typeText(Promise.resolve(resolved), 'hello', {
      hideKeyboard: false,
    });

    expect(resolved.fill).toHaveBeenCalledWith('hello');
    expect(AppiumGestures.hideKeyboard).not.toHaveBeenCalled();
  });
});
