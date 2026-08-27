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

  it('requests the normalized explicit provider context and writes Buy state', async () => {
    const response = { methods: [], selected: null, providerIds: [] };
    getPaymentMethodsForContextMock.mockResolvedValue(response);
    const opts = rampsPaymentMethodsOptions({
      regionCode: ' US ',
      assetId: ' eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ',
      providerId: ' /providers/transak ',
      updateState: true,
    });

    expect(opts.queryKey).toEqual([
      ...rampsPaymentMethodsKeys.all(),
      'us',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '/providers/transak',
      false,
      true,
    ]);
    // A cache hit skips the controller's catalog write, so a state-writing
    // request always refetches.
    expect(opts.staleTime).toBe(0);
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

    // The trailing `false` keeps a read-only deposit request out of the Buy
    // cache entry keyed `true` above.
    expect(opts.queryKey).toEqual([
      ...rampsPaymentMethodsKeys.all(),
      'us',
      'eip155:1/slip44:60',
      'auto',
      true,
      false,
    ]);
    expect(opts.staleTime).toBe(5 * 60 * 1000);
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
