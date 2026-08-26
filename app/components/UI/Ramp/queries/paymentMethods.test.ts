import {
  rampsPaymentMethodsKeys,
  rampsPaymentMethodsOptions,
} from './paymentMethods';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: { getPaymentMethodsForContext: jest.fn() },
  },
}));

const getPaymentMethodsForContextMock = jest.mocked(
  Engine.context.RampsController.getPaymentMethodsForContext,
);

const FIVE_MINUTES = 5 * 60 * 1000;

describe('rampsPaymentMethodsOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a stable normalized query key from region, asset, and provider', () => {
    expect(
      rampsPaymentMethodsKeys.detail({
        regionCode: 'US ',
        assetId: ' eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
        providerId: ' /providers/transak ',
        updateState: true,
      }),
    ).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '/providers/transak',
      false,
      true,
    ]);
  });

  it('keys the deposit context apart, so a read-only request never shares a Buy cache entry', () => {
    const buyKey = rampsPaymentMethodsKeys.detail({
      regionCode: 'us',
      assetId: 'eip155:1/slip44:60',
      providerId: '/providers/transak',
      updateState: true,
    });

    expect(
      rampsPaymentMethodsKeys.detail({
        regionCode: 'us',
        assetId: 'eip155:1/slip44:60',
        autoSelectProvider: true,
        restrictToKnownOrNativeProviders: true,
        updateState: false,
      }),
    ).toEqual([
      ...rampsPaymentMethodsKeys.all(),
      'us',
      'eip155:1/slip44:60',
      'auto',
      true,
      false,
    ]);
    expect(buyKey[buyKey.length - 1]).toBe(true);
  });

  it('caches read-only requests but never state-writing ones', () => {
    // A cache hit skips the controller's catalog write, so `updateState: true`
    // has to refetch. Read-only deposit requests have no such side effect.
    const buy = rampsPaymentMethodsOptions({
      regionCode: 'us',
      assetId: 'eip155:1/slip44:60',
      providerId: '/providers/transak',
      updateState: true,
    });
    const deposit = rampsPaymentMethodsOptions({
      regionCode: 'us',
      assetId: 'eip155:1/slip44:60',
      autoSelectProvider: true,
      updateState: false,
    });

    expect(buy.staleTime).toBe(0);
    expect(deposit.staleTime).toBe(FIVE_MINUTES);
    expect(typeof buy.queryFn).toBe('function');
  });

  it('requests the normalized explicit provider context and writes Buy state', async () => {
    const response = { methods: [], selected: null, providerIds: [] };
    getPaymentMethodsForContextMock.mockResolvedValue(response);
    const opts = rampsPaymentMethodsOptions({
      regionCode: ' US ',
      assetId: ' eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
      providerId: ' /providers/transak ',
      updateState: true,
    });

    await expect(opts.queryFn?.({} as never)).resolves.toBe(response);
    expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
      region: 'us',
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      providers: ['/providers/transak'],
      updateState: true,
    });
  });

  it('requests the auto-resolved deposit context without writing Buy state', async () => {
    const response = { methods: [], selected: null, providerIds: [] };
    getPaymentMethodsForContextMock.mockResolvedValue(response);
    const opts = rampsPaymentMethodsOptions({
      regionCode: 'US',
      assetId: 'eip155:1/slip44:60',
      autoSelectProvider: true,
      restrictToKnownOrNativeProviders: true,
      updateState: false,
    });

    await expect(opts.queryFn?.({} as never)).resolves.toBe(response);
    expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
      region: 'us',
      assetId: 'eip155:1/slip44:60',
      autoSelectProvider: true,
      restrictToKnownOrNativeProviders: true,
      updateState: false,
    });
  });
});
