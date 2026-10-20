/**
 * @jest-environment node
 */

import { getDriver } from './AppiumUtilities.ts';
import Gestures from './Gestures.ts';
import WebView from './WebView.ts';

jest.mock('./PlatformLocator.ts', () => ({
  PlatformDetector: {
    isAndroidAppium: () => false,
  },
}));

jest.mock('./AppiumWebMatchers.ts', () => ({
  __esModule: true,
  default: {
    withWebViewAction: async (
      _pageUrl: string,
      action: () => Promise<void>,
    ) => {
      await action();
    },
  },
}));

jest.mock('./Matchers.ts', () => ({
  __esModule: true,
  default: {
    getElementByWebID: jest.fn().mockResolvedValue({ id: 'web-element' }),
  },
}));

jest.mock('./Gestures.ts', () => ({
  __esModule: true,
  default: {
    scrollToWebViewPort: jest.fn().mockResolvedValue(undefined),
    tap: jest.fn(),
  },
}));

jest.mock('./AppiumUtilities.ts', () => ({
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

const LAVAMOAT_CLICK_ERROR = new Error(
  'LavaMoat - property "self" of globalThis is inaccessible under scuttling mode.',
);

describe('WebView.tapById on iOS', () => {
  const execute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    execute.mockResolvedValue(true);
    jest.mocked(getDriver).mockReturnValue({
      execute,
    } as unknown as ReturnType<typeof getDriver>);
  });

  it('clicks the HTML id when the WebView element click hits LavaMoat scuttling', async () => {
    jest.mocked(Gestures.tap).mockRejectedValue(LAVAMOAT_CLICK_ERROR);

    await WebView.tapById('signTypedDataV3', {
      pageUrl: 'http://localhost:8545',
      description: 'Typed V3 Sign',
    });

    expect(Gestures.tap).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(String(execute.mock.calls[0]?.[0])).toContain('signTypedDataV3');
  });
});
