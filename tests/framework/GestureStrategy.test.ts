jest.mock('./Gestures.ts', () => ({
  __esModule: true,
  default: {
    scrollToElement: jest.fn(),
  },
}));

import Gestures from './Gestures.ts';
import { DetoxGestureStrategy } from './GestureStrategy.ts';

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

    expect(Gestures.scrollToElement).toHaveBeenCalledWith(
      target,
      scrollView,
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
