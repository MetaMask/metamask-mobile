import DeeplinkManager from './DeeplinkManager';
import extractURLParams from './utils/extractURLParams';
import handleDappUrl from './handlers/legacy/handleDappUrl';
import handleUniversalLink from './handlers/legacy/handleUniversalLink';
import connectWithWC from './handlers/legacy/connectWithWC';
import parseDeeplink from './parseDeeplink';
import handleEthereumUrl from './handlers/legacy/handleEthereumUrl';

jest.mock('../../constants/deeplinks');
jest.mock('../../util/Logger');
jest.mock('./DeeplinkManager');
jest.mock('../SDKConnect/utils/DevLogger');
jest.mock('./handlers/legacy/handleDappUrl');
jest.mock('./handlers/legacy/handleUniversalLink');
jest.mock('./handlers/legacy/connectWithWC');
jest.mock('./handlers/legacy/handleEthereumUrl');
jest.mock('../../../locales/i18n', () => ({
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

  const mockHandleEthereumUrl = handleEthereumUrl as jest.MockedFunction<
    typeof handleEthereumUrl
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    instance = {} as unknown as DeeplinkManager;
    mockHandleEthereumUrl.mockResolvedValue(undefined);
  });

  it('should call handleUniversalLinks for HTTP protocol', async () => {
    const url = 'http://example.com/';
    const browserCallBackMock = jest.fn();
    const onHandledMock = jest.fn();

    const { urlObj } = extractURLParams(url);

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith({
      instance,
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
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: browserCallBackMock,
      onHandled: onHandledMock,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith({
      instance,
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
      deeplinkManager: instance,
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
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleEthereumUrl).toHaveBeenCalledWith({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
    });
  });

  it('should call handleDappProtocol for DAPP protocol', async () => {
    const url = 'dapp://example.com';
    const { urlObj } = extractURLParams(url);

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleDappProtocol).toHaveBeenCalledWith({
      instance,
      handled: expect.any(Function),
      urlObj,
      browserCallBack: mockBrowserCallBack,
    });
  });

  it('should call handleUniversalLinks for METAMASK protocol', async () => {
    const url = 'metamask://example.com';
    const expectedMappedUrl = 'https://link.metamask.io/example.com';
    const { urlObj } = extractURLParams(expectedMappedUrl);

    await parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith({
      instance,
      handled: expect.any(Function),
      urlObj,
      browserCallBack: mockBrowserCallBack,
      url: expectedMappedUrl,
      source: 'testOrigin',
    });
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
});
