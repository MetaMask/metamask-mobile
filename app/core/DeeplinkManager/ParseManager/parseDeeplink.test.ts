import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleParseDappProtocol from './handleParseDappProtocol';
import handleParseMetaMaskProtocol from './handleParseMetaMaskProtocol';
import handleParseUniversalLinks from './handleParseUniversalLinks';
import handleParseWCProtocol from './handleParseWCProtocol';
import parseDeeplink from './parseDeeplink';

jest.mock('../../../constants/deeplinks');
jest.mock('../../../util/Logger');
jest.mock('../DeeplinkManager');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('./handleParseDappProtocol');
jest.mock('./handleParseMetaMaskProtocol');
jest.mock('./handleParseUniversalLinks');
jest.mock('./handleParseWCProtocol');

describe('parseDeeplink', () => {
  let instance: DeeplinkManager;
  const mockOnHandled = jest.fn();
  const mockBrowserCallBack = jest.fn();

  const mockHandleUniversalLinks =
    handleParseUniversalLinks as jest.MockedFunction<
      typeof handleParseUniversalLinks
    >;

  const mockHandleWCProtocol = handleParseWCProtocol as jest.MockedFunction<
    typeof handleParseWCProtocol
  >;

  const mockHandleDappProtocol = handleParseDappProtocol as jest.MockedFunction<
    typeof handleParseDappProtocol
  >;

  const mockHandleMetaMaskProtocol =
    handleParseMetaMaskProtocol as jest.MockedFunction<
      typeof handleParseMetaMaskProtocol
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
});
