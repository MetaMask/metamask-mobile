/**
 * @jest-environment node
 */

import { getDriver } from './AppiumUtilities.ts';
import Gestures from './Gestures.ts';
import Matchers from './Matchers.ts';
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

const LAVAMOAT_FIND_ERROR = new Error(
  'unknown error: WebDriverError: Remote debugger error with code \'undefined\': Error: LavaMoat - property "navigator" of globalThis is inaccessible under scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/issues/2127. when running "element" with method "POST"',
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

  it('clicks the HTML id when WebView element find hits LavaMoat scuttling', async () => {
    jest
      .mocked(Matchers.getElementByWebID)
      .mockRejectedValue(LAVAMOAT_FIND_ERROR);

    await WebView.tapById('download_button', {
      pageUrl: 'http://localhost:8085/download_blob_file.html',
      description: 'Download File website - Download button (iOS)',
    });

    expect(Matchers.getElementByWebID).toHaveBeenCalledTimes(1);
    expect(Gestures.tap).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(String(execute.mock.calls[0]?.[0])).toContain('download_button');
    expect(String(execute.mock.calls[0]?.[0])).toContain('.click()');
  });
});
