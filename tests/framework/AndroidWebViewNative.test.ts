import {
  blurAndroidWebView,
  fillAndroidWebId,
  readAndroidWebIdText,
  scrollAndroidWebIdIntoView,
  selectAndroidWebId,
  tapAndroidWebId,
} from './AndroidWebViewNative';
import AndroidWebViewCdpHelpers, {
  isAndroidWebViewCdpEnabled,
} from './AndroidWebViewCdpHelpers';
import Gestures from './Gestures';
import Matchers from './Matchers';
import PlaywrightContextHelpers from './PlaywrightContextHelpers';
import PlaywrightGestures from './PlaywrightGestures';
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
    isEnabled: async () => true,
    click: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getText: jest.fn().mockResolvedValue('native-text'),
  }),
}));

jest.mock('./AndroidWebViewCdpHelpers', () => ({
  __esModule: true,
  isAndroidWebViewCdpEnabled: jest.fn(() => true),
  default: {
    scrollElementByIdIntoView: jest.fn(),
    tapElementById: jest.fn(),
    fillElementById: jest.fn(),
    readElementTextById: jest.fn(),
    selectOptionById: jest.fn(),
    blurActiveElement: jest.fn(),
  },
}));

jest.mock('./PlaywrightGestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn().mockResolvedValue(undefined),
    hideKeyboard: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./Gestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./Matchers', () => ({
  __esModule: true,
  default: {
    getElementByText: jest.fn((text: string) => ({ text })),
  },
}));

jest.mock('./Utilities', () => {
  const actual = jest.requireActual('./Utilities');
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      waitUntil: jest.fn(async (predicate: () => Promise<boolean>) => {
        await predicate();
      }),
    },
    sleep: jest.fn().mockResolvedValue(undefined),
  };
});

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

function mockDriverWithFindSequence(outcomes: ('miss' | 'hit')[]): jest.Mock {
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
  (getDriver as jest.Mock).mockReturnValue({
    $: dollar,
    keys: jest.fn().mockResolvedValue(undefined),
  });
  return dollar;
}

describe('scrollAndroidWebIdIntoView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
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

  it('skips CDP when ANDROID_WEBVIEW_CDP is disabled', async () => {
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(false);
    mockDriverWithFindSequence(['miss', 'hit']);

    await scrollAndroidWebIdIntoView('connectbip32', {
      pageUrl: 'https://metamask.github.io/snaps/test-snaps/3.5.2/',
    });

    expect(
      AndroidWebViewCdpHelpers.scrollElementByIdIntoView,
    ).not.toHaveBeenCalled();
  });
});

describe('tapAndroidWebId CDP path', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
    (AndroidWebViewCdpHelpers.tapElementById as jest.Mock).mockResolvedValue(
      false,
    );
  });

  it('returns after successful CDP tap without native waitAndTap', async () => {
    (AndroidWebViewCdpHelpers.tapElementById as jest.Mock).mockResolvedValue(
      true,
    );

    await tapAndroidWebId('connectbip32', { pageUrl });

    expect(AndroidWebViewCdpHelpers.tapElementById).toHaveBeenCalledWith(
      'connectbip32',
      { pageUrl },
    );
    expect(PlaywrightGestures.waitAndTap).not.toHaveBeenCalled();
  });

  it('falls back to native tap when CDP returns false', async () => {
    mockDriverWithFindSequence(['hit']);
    (AndroidWebViewCdpHelpers.tapElementById as jest.Mock).mockResolvedValue(
      false,
    );

    await tapAndroidWebId('connectbip32', { pageUrl });

    expect(AndroidWebViewCdpHelpers.tapElementById).toHaveBeenCalled();
    expect(PlaywrightGestures.waitAndTap).toHaveBeenCalled();
  });

  it('skips CDP tap when pageUrl omitted', async () => {
    mockDriverWithFindSequence(['hit']);
    await tapAndroidWebId('connectbip32', {});
    expect(AndroidWebViewCdpHelpers.tapElementById).not.toHaveBeenCalled();
  });

  it('skips CDP tap when kill switch disabled', async () => {
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(false);
    mockDriverWithFindSequence(['hit']);
    await tapAndroidWebId('connectbip32', { pageUrl });
    expect(AndroidWebViewCdpHelpers.tapElementById).not.toHaveBeenCalled();
  });

  it('skips CDP tap when preferNative is set', async () => {
    mockDriverWithFindSequence(['hit']);
    (AndroidWebViewCdpHelpers.tapElementById as jest.Mock).mockResolvedValue(
      true,
    );

    await tapAndroidWebId('connectbip32', {
      pageUrl,
      preferNative: true,
    });

    expect(AndroidWebViewCdpHelpers.tapElementById).not.toHaveBeenCalled();
    expect(PlaywrightGestures.waitAndTap).toHaveBeenCalled();
  });
});

describe('fillAndroidWebId CDP path', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
    (AndroidWebViewCdpHelpers.fillElementById as jest.Mock).mockResolvedValue(
      false,
    );
    (getDriver as jest.Mock).mockReturnValue({
      $: jest.fn(),
      keys: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('returns after successful CDP fill without native keys', async () => {
    (AndroidWebViewCdpHelpers.fillElementById as jest.Mock).mockResolvedValue(
      true,
    );

    await fillAndroidWebId('message', 'hi', { pageUrl });

    expect(AndroidWebViewCdpHelpers.fillElementById).toHaveBeenCalledWith(
      'message',
      'hi',
      { pageUrl },
    );
    expect(getDriver().keys).not.toHaveBeenCalled();
    expect(PlaywrightGestures.hideKeyboard).toHaveBeenCalled();
  });

  it('falls back to native keys when CDP returns false', async () => {
    mockDriverWithFindSequence(['hit']);
    (AndroidWebViewCdpHelpers.fillElementById as jest.Mock).mockResolvedValue(
      false,
    );

    await fillAndroidWebId('message', 'hi', { pageUrl });

    expect(AndroidWebViewCdpHelpers.fillElementById).toHaveBeenCalled();
    expect(getDriver().keys).toHaveBeenCalled();
  });

  it('skips CDP fill when pageUrl omitted', async () => {
    mockDriverWithFindSequence(['hit']);
    await fillAndroidWebId('message', 'hi', {});
    expect(AndroidWebViewCdpHelpers.fillElementById).not.toHaveBeenCalled();
  });

  it('skips CDP fill when kill switch disabled', async () => {
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(false);
    mockDriverWithFindSequence(['hit']);
    await fillAndroidWebId('message', 'hi', { pageUrl });
    expect(AndroidWebViewCdpHelpers.fillElementById).not.toHaveBeenCalled();
  });
});

describe('readAndroidWebIdText CDP path', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
    (
      AndroidWebViewCdpHelpers.readElementTextById as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('returns CDP text without native getText', async () => {
    (
      AndroidWebViewCdpHelpers.readElementTextById as jest.Mock
    ).mockResolvedValue('from-cdp');

    const text = await readAndroidWebIdText('status', { pageUrl });

    expect(text).toBe('from-cdp');
    expect(AndroidWebViewCdpHelpers.readElementTextById).toHaveBeenCalledWith(
      'status',
      { pageUrl },
    );
  });

  it('falls back to native getText when CDP returns undefined', async () => {
    mockDriverWithFindSequence(['hit']);
    (
      AndroidWebViewCdpHelpers.readElementTextById as jest.Mock
    ).mockResolvedValue(undefined);

    const text = await readAndroidWebIdText('status', { pageUrl });

    expect(AndroidWebViewCdpHelpers.readElementTextById).toHaveBeenCalled();
    expect(text).toBe('native-text');
  });

  it('skips CDP read when pageUrl omitted', async () => {
    mockDriverWithFindSequence(['hit']);
    await readAndroidWebIdText('status', {});
    expect(AndroidWebViewCdpHelpers.readElementTextById).not.toHaveBeenCalled();
  });

  it('skips CDP read when kill switch disabled', async () => {
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(false);
    mockDriverWithFindSequence(['hit']);
    await readAndroidWebIdText('status', { pageUrl });
    expect(AndroidWebViewCdpHelpers.readElementTextById).not.toHaveBeenCalled();
  });
});

describe('selectAndroidWebId', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
    (AndroidWebViewCdpHelpers.selectOptionById as jest.Mock).mockResolvedValue(
      false,
    );
  });

  it('returns after successful CDP select without native option tap', async () => {
    (AndroidWebViewCdpHelpers.selectOptionById as jest.Mock).mockResolvedValue(
      true,
    );

    await selectAndroidWebId('chain', 'Ethereum', { pageUrl });

    expect(AndroidWebViewCdpHelpers.selectOptionById).toHaveBeenCalledWith(
      'chain',
      'Ethereum',
      { pageUrl },
    );
    expect(Gestures.waitAndTap).not.toHaveBeenCalled();
  });

  it('falls back to tap select + option text when CDP fails', async () => {
    (AndroidWebViewCdpHelpers.selectOptionById as jest.Mock).mockResolvedValue(
      false,
    );
    (AndroidWebViewCdpHelpers.tapElementById as jest.Mock).mockResolvedValue(
      true,
    );

    await selectAndroidWebId('chain', 'Ethereum', { pageUrl });

    expect(Gestures.waitAndTap).toHaveBeenCalled();
    expect(Matchers.getElementByText).toHaveBeenCalledWith('Ethereum');
  });
});

describe('blurAndroidWebView', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  beforeEach(() => {
    jest.clearAllMocks();
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(true);
    (AndroidWebViewCdpHelpers.blurActiveElement as jest.Mock).mockResolvedValue(
      false,
    );
  });

  it('calls CDP blur then always hideKeyboard', async () => {
    (AndroidWebViewCdpHelpers.blurActiveElement as jest.Mock).mockResolvedValue(
      true,
    );

    await blurAndroidWebView(pageUrl);

    expect(AndroidWebViewCdpHelpers.blurActiveElement).toHaveBeenCalledWith(
      pageUrl,
    );
    expect(PlaywrightGestures.hideKeyboard).toHaveBeenCalled();
  });

  it('skips CDP when kill switch disabled but still hideKeyboard', async () => {
    (isAndroidWebViewCdpEnabled as jest.Mock).mockReturnValue(false);

    await blurAndroidWebView(pageUrl);

    expect(AndroidWebViewCdpHelpers.blurActiveElement).not.toHaveBeenCalled();
    expect(PlaywrightGestures.hideKeyboard).toHaveBeenCalled();
  });
});
