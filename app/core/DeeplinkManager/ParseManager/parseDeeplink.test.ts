import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import handleDappUrl from './handleDappUrl';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import handleUniversalLink from './handleUniversalLink';
import connectWithWC from './connectWithWC';
import parseDeeplink from './parseDeeplink';
import { MetaMetrics, MetaMetricsEvents } from '../../Analytics';
import { store } from '../../../store';

jest.mock('../../../constants/deeplinks', () => ({
  PROTOCOLS: {
    HTTP: 'http',
    HTTPS: 'https',
    WC: 'wc',
    ETHEREUM: 'ethereum',
    DAPP: 'dapp',
    METAMASK: 'metamask',
  },
}));
jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: jest.fn(() => ({
    hasInitialized: jest.fn(() => true),
  })),
}));
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      security: {
        dataCollectionForMarketing: true,
      },
    })),
  },
}));

jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      security: {
        dataCollectionForMarketing: true,
      },
    })),
  },
}));

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
jest.mock('../../Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(),
  },
  MetaMetricsEvents: {
    APP_OPENED: 'APP_OPENED',
  },
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

  describe('Attribution ID handling', () => {
    let mockTrackEvent: jest.Mock;

    beforeEach(() => {
      mockTrackEvent = jest.fn();
      (MetaMetrics.getInstance as jest.Mock).mockReturnValue({
        trackEvent: mockTrackEvent,
      });
    });

    it('should track event with attributionId when data collection is enabled', () => {
      const url = 'https://example.com/?attributionId=test123';
      (store.getState as jest.Mock).mockReturnValue({
        security: { dataCollectionForMarketing: true },
      });

      parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.APP_OPENED,
        { attributionId: 'test123' },
        true
      );
    });

    it('should not track event when attributionId is present but data collection is disabled', () => {
      const url = 'https://example.com/?attributionId=test123';
      (store.getState as jest.Mock).mockReturnValue({
        security: { dataCollectionForMarketing: false },
      });

      parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track event when attributionId is not present', () => {
      const url = 'https://example.com/';
      (store.getState as jest.Mock).mockReturnValue({
        security: { dataCollectionForMarketing: true },
      });

      parseDeeplink({
        deeplinkManager: instance,
        url,
        origin: 'testOrigin',
        browserCallBack: mockBrowserCallBack,
        onHandled: mockOnHandled,
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should handle attributionId with different protocols', () => {
      const protocols = ['http', 'https', 'wc', 'ethereum', 'dapp', 'metamask'];

      protocols.forEach(protocol => {
        const url = `${protocol}://example.com/?attributionId=test_${protocol}`;
        (store.getState as jest.Mock).mockReturnValue({
          security: { dataCollectionForMarketing: true },
        });

        parseDeeplink({
          deeplinkManager: instance,
          url,
          origin: 'testOrigin',
          browserCallBack: mockBrowserCallBack,
          onHandled: mockOnHandled,
        });

        expect(mockTrackEvent).toHaveBeenCalledWith(
          MetaMetricsEvents.APP_OPENED,
          { attributionId: `test_${protocol}` },
          true
        );

        mockTrackEvent.mockClear();
      });
    });
  });

  it('should call handleUniversalLinks for HTTP protocol', () => {
    const url = 'http://example.com/';
    parseDeeplink({
      deeplinkManager: instance,
      url,
      origin: 'testOrigin',
      browserCallBack: mockBrowserCallBack,
      onHandled: mockOnHandled,
    });

    expect(mockHandleUniversalLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        instance,
        urlObj: expect.any(Object),
        params: expect.any(Object),
        browserCallBack: mockBrowserCallBack,
        origin: 'testOrigin',
        wcURL: url,
        url,
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

    expect(mockHandleWCProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        handled: expect.any(Function),
        wcURL: url,
        origin: 'testOrigin',
        params: expect.any(Object),
      }),
    );
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
