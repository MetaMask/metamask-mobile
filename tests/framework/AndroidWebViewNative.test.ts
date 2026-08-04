import {
  scrollAndroidWebIdIntoView,
} from './AndroidWebViewNative';
import AndroidWebViewCdpHelpers, {
  isAndroidWebViewCdpScrollEnabled,
} from './AndroidWebViewCdpHelpers';
import PlaywrightContextHelpers from './PlaywrightContextHelpers';
import { getDriver } from './PlaywrightUtilities';

jest.mock('./PlaywrightContextHelpers', () => ({
  __esModule: true,
  default: {
    switchToNativeContext: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./PlaywrightUtilities', () => ({
  getDriver: jest.fn(),
  boxedStep:
    () =>
    (
      _target: unknown,
      _key: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor =>
      descriptor,
}));

jest.mock('./PlaywrightAdapter', () => ({
  wrapElement: (elem: unknown) => ({
    unwrap: () => elem,
  }),
}));

jest.mock('./AndroidWebViewCdpHelpers', () => ({
  __esModule: true,
  isAndroidWebViewCdpScrollEnabled: jest.fn(() => true),
  default: {
    scrollElementByIdIntoView: jest.fn(),
  },
}));

jest.mock('./playwrightLogger', () => ({
  createPlaywrightLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

interface MockElement {
  waitForExist: jest.Mock;
  elementId?: string;
}

function mockDriverWithFindSequence(
  outcomes: ('miss' | 'hit')[],
): jest.Mock {
  let call = 0;
  const dollar = jest.fn(() => {
    const outcome = outcomes[Math.min(call, outcomes.length - 1)];
    call += 1;
    const elem: MockElement = {
      waitForExist: jest.fn(async () => {
        if (outcome === 'miss') {
          throw new Error('element not found');
        }
      }),
      elementId: outcome === 'hit' ? 'elem-1' : undefined,
    };
    return elem;
  });
  (getDriver as jest.Mock).mockReturnValue({ $: dollar });
  return dollar;
}

describe('scrollAndroidWebIdIntoView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpScrollEnabled as jest.Mock).mockReturnValue(true);
    (
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView as jest.Mock
    ).mockResolvedValue(false);
  });

  it('uses CDP scroll when pageUrl is set and re-finds the resource-id', async () => {
    mockDriverWithFindSequence(['miss', 'hit']);
    (
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView as jest.Mock
    ).mockResolvedValue(true);

    const elem = await scrollAndroidWebIdIntoView('connectbip32', {
      pageUrl: 'https://metamask.github.io/snaps/test-snaps/3.5.2/',
    });

    expect(PlaywrightContextHelpers.switchToNativeContext).toHaveBeenCalled();
    expect(
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView,
    ).toHaveBeenCalledWith('connectbip32', {
      pageUrl: 'https://metamask.github.io/snaps/test-snaps/3.5.2/',
    });
    expect(elem).toBeDefined();
  });

  it('skips CDP when pageUrl is omitted', async () => {
    // in-place miss, then UiScrollable hit (android= UiScrollable selector)
    const dollar = mockDriverWithFindSequence(['miss', 'hit']);

    await scrollAndroidWebIdIntoView('connectbip32', {
      scrollLabels: { connectbip32: 'Connect to BIP-32 Snap' },
    });

    expect(
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView,
    ).not.toHaveBeenCalled();
    expect(dollar).toHaveBeenCalled();
  });

  it('falls back to UiScrollable when CDP scroll returns false', async () => {
    mockDriverWithFindSequence(['miss', 'hit']);
    (
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView as jest.Mock
    ).mockResolvedValue(false);

    await scrollAndroidWebIdIntoView('connectbip32', {
      pageUrl: 'https://metamask.github.io/snaps/test-snaps/3.5.2/',
    });

    expect(
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView,
    ).toHaveBeenCalled();
  });

  it('skips CDP when ANDROID_WEBVIEW_CDP_SCROLL is disabled', async () => {
    (isAndroidWebViewCdpScrollEnabled as jest.Mock).mockReturnValue(false);
    mockDriverWithFindSequence(['miss', 'hit']);

    await scrollAndroidWebIdIntoView('connectbip32', {
      pageUrl: 'https://metamask.github.io/snaps/test-snaps/3.5.2/',
    });

    expect(
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView,
    ).not.toHaveBeenCalled();
  });
});
