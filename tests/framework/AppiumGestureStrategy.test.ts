jest.mock('./PlaywrightGestures.ts', () => ({
  __esModule: true,
  default: {
    dblTap: jest.fn(),
  },
}));

jest.mock('./EncapsulatedElement.ts', () => ({
  asPlaywrightElement: jest.fn(),
}));

import PlaywrightGestures from './PlaywrightGestures.ts';
import { asPlaywrightElement } from './EncapsulatedElement.ts';
import { AppiumGestureStrategy } from './GestureStrategy.ts';
import { PlaywrightElement } from './PlaywrightAdapter.ts';

describe('AppiumGestureStrategy.dblTap', () => {
  const strategy = new AppiumGestureStrategy();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to PlaywrightGestures.dblTap with resolved element', async () => {
    const elem = Promise.resolve({}) as never;
    const playwrightElement = { unwrap: jest.fn() } as never;
    (asPlaywrightElement as jest.Mock).mockResolvedValue(playwrightElement);

    await strategy.dblTap(elem);

    expect(asPlaywrightElement).toHaveBeenCalledWith(elem);
    expect(PlaywrightGestures.dblTap).toHaveBeenCalledWith(playwrightElement);
  });
});

describe('AppiumGestureStrategy.tapAtIndex', () => {
  const strategy = new AppiumGestureStrategy();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPlaywrightElement = (): PlaywrightElement =>
    ({
      click: jest.fn(),
      unwrap: jest.fn(),
    }) as unknown as PlaywrightElement;

  it('clicks indexed element when PlaywrightElement array is provided', async () => {
    const first = createPlaywrightElement();
    const second = createPlaywrightElement();
    const third = createPlaywrightElement();

    await strategy.tapAtIndex([first, second, third], 2);

    expect(third.click).toHaveBeenCalledTimes(1);
    expect(second.click).not.toHaveBeenCalled();
    expect(first.click).not.toHaveBeenCalled();
    expect(asPlaywrightElement).not.toHaveBeenCalled();
  });

  it('throws when array index is out of bounds', async () => {
    const only = createPlaywrightElement();

    await expect(strategy.tapAtIndex([only], 2)).rejects.toThrow(
      'tapAtIndex: index 2 is out of bounds (1 elements)',
    );
  });

  it('throws for single element when index is greater than zero', async () => {
    const elem = Promise.resolve({}) as never;

    await expect(strategy.tapAtIndex(elem, 2)).rejects.toThrow(
      'tapAtIndex: Appium requires a PlaywrightElement[] array for index > 0.',
    );
  });

  it('uses single element pass-through when index is zero', async () => {
    const elem = Promise.resolve({}) as never;
    const playwrightElement = createPlaywrightElement();
    (asPlaywrightElement as jest.Mock).mockResolvedValue(playwrightElement);

    await strategy.tapAtIndex(elem, 0);

    expect(asPlaywrightElement).toHaveBeenCalledWith(elem);
    expect(playwrightElement.click).toHaveBeenCalledTimes(1);
  });
});
