import { assertResolvedElementId } from './PlaywrightGestures.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';

describe('assertResolvedElementId', () => {
  const mockElement = (opts: {
    elementId?: unknown;
    selector?: unknown;
    elementIdError?: Error;
  }): PlaywrightElement =>
    ({
      unwrap: () => ({
        get elementId() {
          if (opts.elementIdError) {
            return Promise.reject(opts.elementIdError);
          }
          return Promise.resolve(opts.elementId);
        },
        get selector() {
          return Promise.resolve(opts.selector);
        },
      }),
    }) as unknown as PlaywrightElement;

  it('returns elementId when present', async () => {
    const elem = mockElement({ elementId: 'abc-123' });
    await expect(
      assertResolvedElementId(elem, 'scrollIntoView', 'target'),
    ).resolves.toBe('abc-123');
  });

  it('throws a clear error when elementId is undefined', async () => {
    const elem = mockElement({
      elementId: undefined,
      selector: '~wallet-scroll-view',
    });
    await expect(
      assertResolvedElementId(elem, 'scrollIntoView', 'scrollableElement'),
    ).rejects.toThrow(
      /Cannot scrollIntoView: scrollableElement has no valid Appium elementId \(selector: ~wallet-scroll-view\).*refusing to call getElementRect/,
    );
  });

  it('throws a clear error when elementId is empty string', async () => {
    const elem = mockElement({ elementId: '' });
    await expect(
      assertResolvedElementId(elem, 'longPress', 'target'),
    ).rejects.toThrow(
      /Cannot longPress: target has no valid Appium elementId.*refusing to call getElementRect/,
    );
  });

  it('throws when reading elementId fails', async () => {
    const elem = mockElement({
      elementIdError: new Error('stale element reference'),
    });
    await expect(
      assertResolvedElementId(elem, 'scrollIntoView', 'target'),
    ).rejects.toThrow(
      /Cannot scrollIntoView: failed to read target elementId \(stale element reference\)/,
    );
  });
});
