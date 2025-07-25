import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleUniversalLink from './handleUniversalLink';
import connectWithWC from './connectWithWC';
import handleEthereumUrl from '../Handlers/handleEthereumUrl';
import parseDeeplink from './parseDeeplink';

jest.mock('../../../constants/deeplinks');
jest.mock('../../../util/Logger');
jest.mock('../DeeplinkManager');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('./handleDappUrl');
jest.mock('./handleMetaMaskDeeplink');
jest.mock('./handleUniversalLink');
jest.mock('./connectWithWC');
jest.mock('../Handlers/handleEthereumUrl');
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

  const mockHandleEthereumUrl = handleEthereumUrl as jest.MockedFunction<
    typeof handleEthereumUrl
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleUniversalLinks for HTTP protocol', async () => {
    const url = 'http://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj } = extractURLParams(url);

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith({
      handled: expect.any(Function),
      urlObj,
      browserCallBack: browserCallBackMock,
      url,
      source: 'testOrigin',
    });
  });

  it('should call handleUniversalLinks for HTTP and HTTPS protocols', async () => {
    const url = 'https://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj } = extractURLParams(url);

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith({
      handled: expect.any(Function),
      urlObj,
      browserCallBack: browserCallBackMock,
      url,
      source: 'testOrigin',
    });
  });

  it('should call handleWCProtocol for WC protocol', async () => {
    const url = 'wc://example.com';
    const { params } = extractURLParams(url);

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleWCProtocol).toHaveBeenCalledWith({
      handled: expect.any(Function),
      wcURL: url,
      origin: 'testOrigin',
      params,
    });
  });

  it('should handle Ethereum URL', async () => {
    const url = 'ethereum://example.com';

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleEthereumUrl).toHaveBeenCalledWith({
      url,
      origin: 'testOrigin',
    });
  });

  it('should call handleDappProtocol for DAPP protocol', async () => {
    const url = 'dapp://example.com';
    const { urlObj } = extractURLParams(url);

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleDappProtocol).toHaveBeenCalledWith({
      handled: expect.any(Function),
      urlObj,
      browserCallBack: mockBrowserCallBack,
    });
  });

  it('should call handleMetaMaskProtocol for METAMASK protocol', async () => {
    const url = 'metamask://example.com';
    const { params } = extractURLParams(url);

    await parseDeeplink({
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleMetaMaskProtocol).toHaveBeenCalledWith({
      handled: expect.any(Function),
      wcURL: url,
      origin: 'testOrigin',
      params,
      url,
    });
  });

  it('should return false if the protocol is not supported', async () => {
    const url = 'unsupported://example.com';

    const result = await parseDeeplink({
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
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(result).toBe(false);
    });
  });
});
