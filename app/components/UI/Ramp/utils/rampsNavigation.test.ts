import Routes from '../../../../constants/navigation/Routes';
import {
  createBuildQuoteRoute,
  createRampsOrderDetailsRoute,
  getNavigateAfterExternalBrowserRoutes,
} from './rampsNavigation';

describe('rampsNavigation', () => {
  describe('getNavigateAfterExternalBrowserRoutes', () => {
    it('returns BuildQuote route when returnDestination is buildQuote', () => {
      const routes = getNavigateAfterExternalBrowserRoutes({
        returnDestination: 'buildQuote',
      });

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({
        name: Routes.RAMP.BUILD_QUOTE,
        params: {},
      });
      expect(routes[0]).toEqual(createBuildQuoteRoute());
    });

    it('returns order details route when returnDestination is order', () => {
      const routes = getNavigateAfterExternalBrowserRoutes({
        returnDestination: 'order',
        orderCode: 'ord-abc-123',
        providerCode: 'moonpay',
      });

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual(
        createRampsOrderDetailsRoute({
          orderId: 'ord-abc-123',
          showCloseButton: true,
        }),
      );
      expect(routes[0]).toEqual({
        name: Routes.RAMP.RAMPS_ORDER_DETAILS,
        params: {
          orderId: 'ord-abc-123',
          showCloseButton: true,
        },
      });
    });

    it('accepts walletAddress in opts (order route params unchanged)', () => {
      const routes = getNavigateAfterExternalBrowserRoutes({
        returnDestination: 'order',
        orderCode: 'ord-456',
        providerCode: 'paypal',
        walletAddress: '0xabcdef',
      });

      expect(routes[0]).toEqual({
        name: Routes.RAMP.RAMPS_ORDER_DETAILS,
        params: {
          orderId: 'ord-456',
          showCloseButton: true,
        },
      });
    });

    it('returns order details route with callbackUrl when returning from external browser', () => {
      const routes = getNavigateAfterExternalBrowserRoutes({
        returnDestination: 'order',
        callbackUrl: 'metamask://on-ramp/providers/paypal?orderId=abc123',
        providerCode: 'paypal-staging',
        walletAddress: '0x1234',
      });

      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({
        name: Routes.RAMP.RAMPS_ORDER_DETAILS,
        params: {
          callbackUrl: 'metamask://on-ramp/providers/paypal?orderId=abc123',
          providerCode: 'paypal-staging',
          walletAddress: '0x1234',
          showCloseButton: true,
        },
      });
    });
  });
});
