import Routes from '../../../../constants/navigation/Routes';
import handleRampReturnUrl from './handleRampReturnUrl';
import NavigationService from '../../../../core/NavigationService';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../headless/externalBrowserReturn', () => ({
  clearExternalReturnCorrelation: jest.fn(),
  completeHeadlessExternalReturn: jest.fn(),
  emitExternalOrderFailed: jest.fn(),
  findExternalReturnCorrelationForDeeplink: jest.fn(() => null),
}));

jest.mock('../headless/headlessEntryNavigation', () => ({
  dismissHeadlessEntryFromRoot: jest.fn(),
}));

jest.mock('../headless/sessionRegistry', () => ({
  failSession: jest.fn(),
  getSession: jest.fn(() => undefined),
}));

const mockExternalReturn = jest.requireMock(
  '../headless/externalBrowserReturn',
) as {
  clearExternalReturnCorrelation: jest.Mock;
  completeHeadlessExternalReturn: jest.Mock;
  emitExternalOrderFailed: jest.Mock;
  findExternalReturnCorrelationForDeeplink: jest.Mock;
};
const mockDismissFromRoot = jest.requireMock(
  '../headless/headlessEntryNavigation',
).dismissHeadlessEntryFromRoot as jest.Mock;
const mockSessionRegistry = jest.requireMock('../headless/sessionRegistry') as {
  failSession: jest.Mock;
  getSession: jest.Mock;
};

const CORRELATION = {
  sessionId: 'headless-buy-1',
  providerCode: 'coinbase-m',
  walletAddress: '0xwallet',
  orderId: 'pre-order-1',
  analytics: { checkoutSessionId: 'checkout-1' },
  launchedAt: Date.now(),
};

async function flushAsync(): Promise<void> {
  await new Promise(process.nextTick);
  await new Promise(process.nextTick);
}

describe('handleRampReturnUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to RAMPS_ORDER_DETAILS with orderId from query string', () => {
    handleRampReturnUrl({ rampReturnPath: '?orderId=abc123' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: 'abc123', showCloseButton: true },
    );
  });

  it('parses orderId from a path with leading slash', () => {
    handleRampReturnUrl({ rampReturnPath: '/return?orderId=order-42' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: 'order-42', showCloseButton: true },
    );
  });

  it('parses orderId from an absolute URL', () => {
    handleRampReturnUrl({
      rampReturnPath: 'https://example.com/return?orderId=zzz',
    });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: 'zzz', showCloseButton: true },
    );
  });

  it('navigates with undefined orderId when the query parameter is absent', () => {
    handleRampReturnUrl({ rampReturnPath: '?other=value' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: undefined, showCloseButton: true },
    );
  });

  it('navigates with undefined orderId when there is no query string', () => {
    handleRampReturnUrl({ rampReturnPath: '/some-path' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: undefined, showCloseButton: true },
    );
  });

  it('navigates with undefined orderId for an empty path', () => {
    handleRampReturnUrl({ rampReturnPath: '' });

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.RAMPS_ORDER_DETAILS,
      { orderId: undefined, showCloseButton: true },
    );
  });

  it('logs an error and does not navigate when the URL constructor throws', () => {
    handleRampReturnUrl({ rampReturnPath: 'http://[' });

    expect(Logger.error).toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
  });

  describe('headless external-browser return (P2.M2 / M3)', () => {
    beforeEach(() => {
      mockExternalReturn.findExternalReturnCorrelationForDeeplink.mockReturnValue(
        CORRELATION,
      );
      mockExternalReturn.completeHeadlessExternalReturn.mockResolvedValue({
        providerOrderId: 'order-1',
      });
      mockSessionRegistry.getSession.mockReturnValue(undefined);
    });

    it('resolves the deeplink into the shared completion instead of navigating (M2)', async () => {
      handleRampReturnUrl({
        rampReturnPath: '/providers/coinbase-m?orderId=order-1',
      });
      await flushAsync();

      expect(
        mockExternalReturn.completeHeadlessExternalReturn,
      ).toHaveBeenCalledWith({
        sessionId: 'headless-buy-1',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
        orderIdFallback: 'order-1',
      });
      expect(mockDismissFromRoot).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
    });

    it('uses the correlation provider code when the deeplink path carries none', async () => {
      handleRampReturnUrl({ rampReturnPath: '?orderId=order-1' });
      await flushAsync();

      expect(
        mockExternalReturn.completeHeadlessExternalReturn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ providerCode: 'coinbase-m' }),
      );
    });

    it('does nothing more when the completion was already handled elsewhere (null)', async () => {
      mockExternalReturn.completeHeadlessExternalReturn.mockResolvedValue(null);
      handleRampReturnUrl({
        rampReturnPath: '/providers/coinbase-m?orderId=order-1',
      });
      await flushAsync();

      expect(mockDismissFromRoot).not.toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
      expect(mockSessionRegistry.failSession).not.toHaveBeenCalled();
    });

    it('fails a live session with QUOTE_FAILED when resolution fails (M7)', async () => {
      mockExternalReturn.completeHeadlessExternalReturn.mockRejectedValue(
        new Error('lookup failed'),
      );
      mockSessionRegistry.getSession.mockReturnValue({
        id: 'headless-buy-1',
      });
      handleRampReturnUrl({
        rampReturnPath: '/providers/coinbase-m?orderId=order-1',
      });
      await flushAsync();

      expect(mockExternalReturn.emitExternalOrderFailed).toHaveBeenCalled();
      expect(mockSessionRegistry.failSession).toHaveBeenCalledWith(
        'headless-buy-1',
        expect.any(Error),
        'QUOTE_FAILED',
      );
      expect(
        mockExternalReturn.clearExternalReturnCorrelation,
      ).toHaveBeenCalledWith('headless-buy-1');
      expect(mockDismissFromRoot).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).not.toHaveBeenCalled();
    });

    it('falls back to order details when resolution fails with no live session (E2 fallback)', async () => {
      mockExternalReturn.completeHeadlessExternalReturn.mockRejectedValue(
        new Error('lookup failed'),
      );
      mockSessionRegistry.getSession.mockReturnValue(undefined);
      handleRampReturnUrl({
        rampReturnPath: '/providers/coinbase-m?orderId=order-1',
      });
      await flushAsync();

      expect(mockSessionRegistry.failSession).not.toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        Routes.RAMP.RAMPS_ORDER_DETAILS,
        { orderId: 'order-1', showCloseButton: true },
      );
    });
  });
});
