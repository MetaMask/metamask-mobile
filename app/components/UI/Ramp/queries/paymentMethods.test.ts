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
    ]);
  });

  it('builds query options with provider-scoped key and zero staleTime', () => {
    const opts = rampsPaymentMethodsOptions({
      regionCode: 'us',
      assetId: 'eip155:1/slip44:60',
      providerId: '/providers/transak',
      updateState: true,
    });

    expect(opts.queryKey).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'eip155:1/slip44:60',
      '/providers/transak',
      false,
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(0);
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
});
