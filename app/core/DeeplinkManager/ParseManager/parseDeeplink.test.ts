jest.mock('../../../constants/deeplinks');
jest.mock('../../../util/Logger');
jest.mock('../DeeplinkManager');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('./handleDappProtocol');
jest.mock('./handleMetaMaskProtocol');
jest.mock('./handleUniversalLinks');
jest.mock('./handleWCProtocol');

import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleDappProtocol from './handleDappProtocol';
import handleMetaMaskProtocol from './handleMetaMaskProtocol';
import handleUniversalLinks from './handleUniversalLinks';
import handleWCProtocol from './handleWCProtocol';
import parseDeeplink from './parseDeeplink';

describe('parseDeeplink', () => {
  let instance: DeeplinkManager;
  const mockOnHandled = jest.fn();
  const mockBrowserCallBack = jest.fn();

  const mockHandleUniversalLinks = handleUniversalLinks as jest.MockedFunction<
    typeof handleUniversalLinks
  >;

  const mockHandleWCProtocol = handleWCProtocol as jest.MockedFunction<
    typeof handleWCProtocol
  >;

  const mockHandleDappProtocol = handleDappProtocol as jest.MockedFunction<
    typeof handleDappProtocol
  >;

  const mockHandleMetaMaskProtocol =
    handleMetaMaskProtocol as jest.MockedFunction<
      typeof handleMetaMaskProtocol
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    instance = {
      _handleEthereumUrl: jest.fn(),
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
