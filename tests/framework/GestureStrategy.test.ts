jest.mock('./Gestures.ts', () => ({
  __esModule: true,
  default: {
    scrollToElement: jest.fn(),
    typeText: jest.fn(),
  },
}));

import Gestures from './Gestures.ts';
import { DetoxGestureStrategy } from './GestureStrategy.ts';
import { asDetoxElement } from './EncapsulatedElement.ts';

jest.mock('./EncapsulatedElement.ts', () => ({
  asDetoxElement: jest.fn((elem) => elem),
}));

describe('DetoxGestureStrategy.scrollToElement', () => {
  const strategy = new DetoxGestureStrategy();

  const createDetoxElement = (): DetoxElement =>
    ({ tap: jest.fn() }) as unknown as DetoxElement;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards matcher scrollView to Gestures.scrollToElement', async () => {
    const target = createDetoxElement();
    const matcher = {
      type: 'id',
      value: 'scroll-view',
    } as unknown as Detox.NativeMatcher;
    const scrollView = Promise.resolve(matcher);

    await strategy.scrollToElement(target, scrollView, {
      timeout: 1000,
      description: 'scroll to token',
    });

    expect(Gestures.scrollToElement).toHaveBeenCalledTimes(1);

    const [forwardedTarget, forwardedScrollView, forwardedOpts] = (
      Gestures.scrollToElement as jest.Mock
    ).mock.calls[0];

    expect(forwardedTarget).toBe(target);
    await expect(forwardedScrollView).resolves.toBe(matcher);
    expect(forwardedOpts).toEqual(
      expect.objectContaining({
        timeout: 1000,
        elemDescription: 'scroll to token',
      }),
    );
  });

  it('rejects DetoxElement passed as scrollView', async () => {
    const target = createDetoxElement();
    const invalidScrollView = createDetoxElement();

    await expect(
      strategy.scrollToElement(
        target,
        invalidScrollView as unknown as Promise<Detox.NativeMatcher>,
      ),
    ).rejects.toThrow(
      'DetoxGestureStrategy.scrollToElement requires a Detox NativeMatcher',
    );
  });
});

describe('DetoxGestureStrategy.typeText', () => {
  const strategy = new DetoxGestureStrategy();

  const createDetoxElement = (): DetoxElement =>
    ({ tap: jest.fn() }) as unknown as DetoxElement;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards hideKeyboard and clearFirst defaults to Gestures.typeText', async () => {
    const elem = createDetoxElement();

    await strategy.typeText(elem, 'hello');

    expect(asDetoxElement).toHaveBeenCalledWith(elem);
    expect(Gestures.typeText).toHaveBeenCalledWith(elem, 'hello', {
      hideKeyboard: true,
      clearFirst: true,
      timeout: undefined,
      elemDescription: undefined,
    });
  });

  it('forwards explicit hideKeyboard and clearFirst options', async () => {
    const elem = createDetoxElement();

    await strategy.typeText(elem, 'secret', {
      hideKeyboard: false,
      clearFirst: false,
      timeout: 5000,
      description: 'password field',
    });

    expect(Gestures.typeText).toHaveBeenCalledWith(elem, 'secret', {
      hideKeyboard: false,
      clearFirst: false,
      timeout: 5000,
      elemDescription: 'password field',
    });
  });
});
