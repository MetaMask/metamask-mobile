import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleUniversalLink from './handleUniversalLink';
import connectWithWC from './connectWithWC';
import parseDeeplink from './parseDeeplink';

jest.mock('../../../constants/deeplinks');
jest.mock('../../../util/Logger');
jest.mock('../DeeplinkManager');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('./handleDappUrl');
jest.mock('./handleMetaMaskDeeplink');
jest.mock('./handleUniversalLink');
jest.mock('./connectWithWC');
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

  beforeEach(() => {
    jest.clearAllMocks();
    instance = {
      _handleEthereumUrl: jest.fn().mockResolvedValue(null),
    } as unknown as DeeplinkManager;
  });

  it('should call handleUniversalLinks for HTTP protocol', () => {
    const url = 'http://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj, params } = extractURLParams(url);

    parseDeeplink({
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

  it('should call handleUniversalLinks for HTTP and HTTPS protocols', () => {
    const url = 'https://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj, params } = extractURLParams(url);

    parseDeeplink({
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

  it('should call handleWCProtocol for WC protocol', () => {
    const url = 'wc://example.com';

    parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleWCProtocol).toHaveBeenCalled();
  });

  it('should handle Ethereum URL', () => {
    const url = 'ethereum://example.com';

    parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(instance._handleEthereumUrl).toHaveBeenCalledWith(url, 'testOrigin');
  });

  it('should call handleDappProtocol for DAPP protocol', () => {
    const url = 'dapp://example.com';

    parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleDappProtocol).toHaveBeenCalled();
  });

  it('should call handleMetaMaskProtocol for METAMASK protocol', () => {
    const url = 'metamask://example.com';

    parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleMetaMaskProtocol).toHaveBeenCalled();
  });

  it('should return false if the protocol is not supported', () => {
    const url = 'unsupported://example.com';

    const result = parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(result).toBe(false);
  });

  it('should return true if the protocol is supported', () => {
    const url = 'http://example.com';

    const result = parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(result).toBe(true);
  });

  invalidUrls.forEach((url) => {
    it(`should log an error and alert the user when an invalid URL is passed => url=${url}`, () => {
      const result = parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(false);
    });
  });
});
