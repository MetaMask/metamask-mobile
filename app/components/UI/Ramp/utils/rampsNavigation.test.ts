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
    });
    expect(result).toEqual({
      name: Routes.RAMP.RAMPS_ORDER_DETAILS,
      params: {
        orderId: 'abc-123',
        showCloseButton: true,
      },
    });
  });

  it('allows optional showCloseButton', () => {
    const result = createRampsOrderDetailsRoute({
      orderId: 'x',
    });
    expect(result.params.showCloseButton).toBeUndefined();
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
