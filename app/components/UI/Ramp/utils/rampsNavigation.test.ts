import Routes from '../../../../constants/navigation/Routes';
import {
  createRampsOrderDetailsRoute,
  createBuildQuoteRoute,
} from './rampsNavigation';

describe('createRampsOrderDetailsRoute', () => {
  it('returns route with RAMPS_ORDER_DETAILS name and params', () => {
    const result = createRampsOrderDetailsRoute({
      orderId: 'abc-123',
      showCloseButton: true,
      providerCode: 'paypal',
      walletAddress: '0x123',
    });
    expect(result).toEqual({
      name: Routes.RAMP.RAMPS_ORDER_DETAILS,
      params: {
        orderId: 'abc-123',
        showCloseButton: true,
        providerCode: 'paypal',
        walletAddress: '0x123',
      },
    });
  });

  it('allows optional walletAddress', () => {
    const result = createRampsOrderDetailsRoute({
      orderId: 'x',
      showCloseButton: false,
      providerCode: 'moonpay',
    });
    expect(result.params.walletAddress).toBeUndefined();
  });
});

describe('createBuildQuoteRoute', () => {
  it('returns route with BUILD_QUOTE name and empty params', () => {
    const result = createBuildQuoteRoute();
    expect(result).toEqual({
      name: Routes.RAMP.BUILD_QUOTE,
      params: {},
    });
  });
});
