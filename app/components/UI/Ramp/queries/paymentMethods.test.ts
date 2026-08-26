import {
  rampsPaymentMethodsKeys,
  rampsPaymentMethodsOptions,
} from './paymentMethods';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getPaymentMethodsForContext: jest.fn(),
    },
  },
}));

describe('rampsPaymentMethodsOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keys by normalized region, asset, and provider without payment-method selection', () => {
    expect(
      rampsPaymentMethodsKeys.detail({
        regionCode: ' US ',
        assetId: ' eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
        providerId: ' /providers/transak ',
      }),
    ).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '/providers/transak',
    ]);
  });

  it('builds context query options with staleTime zero', () => {
    const opts = rampsPaymentMethodsOptions({
      regionCode: 'us',
      assetId: 'eip155:1/slip44:60',
      providerId: '/providers/transak',
    });

    expect(opts.queryKey).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'eip155:1/slip44:60',
      '/providers/transak',
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(0);
  });

  it('requests and returns the exact normalized explicit context', async () => {
    const response = {
      methods: [],
      selected: null,
      providerIds: ['/providers/transak'],
    };
    jest
      .mocked(
        Engine.context.RampsController.getPaymentMethodsForContext as jest.Mock,
      )
      .mockResolvedValue(response);
    const opts = rampsPaymentMethodsOptions({
      regionCode: ' US ',
      assetId: ' eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
      providerId: ' /providers/transak ',
    });

    const result = await opts.queryFn?.({} as never);

    expect(
      Engine.context.RampsController.getPaymentMethodsForContext,
    ).toHaveBeenCalledWith({
      region: 'us',
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      providers: ['/providers/transak'],
      updateState: true,
    });
    expect(result).toBe(response);
  });
});
