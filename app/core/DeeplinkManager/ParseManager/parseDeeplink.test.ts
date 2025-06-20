import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleUniversalLink from './handleUniversalLink';
import connectWithWC from './connectWithWC';
import parseDeeplink from './parseDeeplink';
import {
  verifyDeeplinkSignature,
  hasSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';

jest.mock('../../../constants/deeplinks');
jest.mock('../../../util/Logger');
jest.mock('../DeeplinkManager');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('./handleDappUrl');
jest.mock('./handleMetaMaskDeeplink');
jest.mock('./handleUniversalLink');
jest.mock('./connectWithWC');
jest.mock('./utils/verifySignature');
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const invalidUrls = [
  'htp://incorrect-format-url',
  'http://',
  ':invalid-protocol://some-url',
  '',
  'https://?!&%5E#@()*]',
];

describe('parseDeeplink', () => {
  let instance: DeeplinkManager;
  const mockOnHandled = jest.fn();
  const mockBrowserCallBack = jest.fn();

  const mockHandleUniversalLinks = handleUniversalLink as jest.MockedFunction<
    typeof handleUniversalLink
  >;

  const mockHandleWCProtocol = connectWithWC as jest.MockedFunction<
    typeof connectWithWC
  >;

  const mockHandleDappProtocol = handleDappUrl as jest.MockedFunction<
    typeof handleDappUrl
  >;

  const mockHandleMetaMaskProtocol =
    handleMetaMaskDeeplink as jest.MockedFunction<
      typeof handleMetaMaskDeeplink
    >;

  const mockHasSignature = hasSignature as jest.MockedFunction<
    typeof hasSignature
  >;
  const mockVerifyDeeplinkSignature =
    verifyDeeplinkSignature as jest.MockedFunction<
      typeof verifyDeeplinkSignature
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    instance = {
      _handleEthereumUrl: jest.fn().mockResolvedValue(null),
    } as unknown as DeeplinkManager;
  });

  it('should call handleUniversalLinks for HTTP protocol', async () => {
    const url = 'http://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj, params } = extractURLParams(url);

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        instance,
        urlObj,
        params,
        browserCallBack: browserCallBackMock,
        origin: 'testOrigin',
        wcURL: url,
      }),
    );
  });

  it('should call handleUniversalLinks for HTTP and HTTPS protocols', async () => {
    const url = 'https://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj, params } = extractURLParams(url);

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        instance,
        urlObj,
        params,
        browserCallBack: browserCallBackMock,
        origin: 'testOrigin',
        wcURL: url,
      }),
    );
  });

  it('should call handleWCProtocol for WC protocol', async () => {
    const url = 'wc://example.com';

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleWCProtocol).toHaveBeenCalled();
  });

  it('should handle Ethereum URL', async () => {
    const url = 'ethereum://example.com';

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(instance._handleEthereumUrl).toHaveBeenCalledWith(url, 'testOrigin');
  });

  it('should call handleDappProtocol for DAPP protocol', async () => {
    const url = 'dapp://example.com';

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleDappProtocol).toHaveBeenCalled();
  });

  it('should call handleMetaMaskProtocol for METAMASK protocol', async () => {
    const url = 'metamask://example.com';

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleMetaMaskProtocol).toHaveBeenCalled();
  });

  it('should return false if the protocol is not supported', async () => {
    const url = 'unsupported://example.com';

    const result = await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(result).toBe(false);
  });

  it('should return true if the protocol is supported', async () => {
    const url = 'http://example.com';

    const result = await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(result).toBe(true);
  });

  invalidUrls.forEach((url) => {
    it(`should log an error and alert the user when an invalid URL is passed => url=${url}`, async () => {
      const result = await parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(false);
    });
  });

  describe('signature verification', () => {
    it('should return true for valid signature', async () => {
      const url = 'https://example.com?param1=value1&sig=validSignature';
      mockHasSignature.mockReturnValue(true);
      mockVerifyDeeplinkSignature.mockResolvedValue(VALID);

      const result = await parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(true);
      expect(mockHasSignature).toHaveBeenCalled();
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
    });

    it('should return false for invalid signature', async () => {
      const url = 'https://example.com?param1=value1&sig=invalidSignature';
      mockHasSignature.mockReturnValue(true);
      mockVerifyDeeplinkSignature.mockResolvedValue(INVALID);

      const result = await parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(false);
      expect(mockHasSignature).toHaveBeenCalled();
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
    });

    it('should return false for missing signature', async () => {
      const url = 'https://example.com?param1=value1';
      mockHasSignature.mockReturnValue(true);
      mockVerifyDeeplinkSignature.mockResolvedValue(MISSING);

      const result = await parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(false);
      expect(mockHasSignature).toHaveBeenCalled();
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
    });

    it('should continue normal processing when no signature is present', async () => {
      const url = 'https://example.com?param1=value1';
      mockHasSignature.mockReturnValue(false);

      await parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(mockHasSignature).toHaveBeenCalled();
      expect(mockVerifyDeeplinkSignature).not.toHaveBeenCalled();
      expect(mockHandleUniversalLinks).toHaveBeenCalled();
    });
  });
});
