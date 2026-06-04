import {
  RAMPS_QUOTES_STALE_TIME_MS,
  rampsQuotesKeys,
  rampsQuotesOptions,
} from './quotes';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getQuotes: jest.fn(),
    },
  },
}));

describe('rampsQuotesOptions', () => {
  it('creates a stable query key for quotes', () => {
    expect(
      rampsQuotesKeys.detail({
        assetId: 'eip155:1/slip44:60',
        amount: 100,
        walletAddress: '0x123',
        paymentMethods: ['/payments/card'],
        providers: ['/providers/transak'],
      }),
    ).toEqual([
      'ramps',
      'quotes',
      'eip155:1/slip44:60',
      100,
      '0x123',
      '/payments/card',
      '/providers/transak',
    ]);
  });

  it('builds query options for quotes', () => {
    const opts = rampsQuotesOptions({
      assetId: 'eip155:1/slip44:60',
      amount: 100,
      walletAddress: '0x123',
      paymentMethods: ['/payments/card'],
      providers: ['/providers/transak'],
    });

    expect(opts.queryKey).toEqual([
      'ramps',
      'quotes',
      'eip155:1/slip44:60',
      100,
      '0x123',
      '/payments/card',
      '/providers/transak',
    ]);
    expect(typeof opts.queryFn).toBe('function');
    expect(opts.staleTime).toBe(RAMPS_QUOTES_STALE_TIME_MS);
  });

  it('queryFn filters blocked providers from params and response', async () => {
    (Engine.context.RampsController.getQuotes as jest.Mock).mockResolvedValue({
      success: [
        { provider: '/providers/transak' },
        { provider: '/providers/blockchain-com' },
      ],
      sorted: [
        {
          sortBy: 'price',
          ids: ['/providers/blockchain-com', '/providers/transak'],
        },
      ],
      error: [],
      customActions: [],
    });

    const opts = rampsQuotesOptions({
      assetId: 'eip155:1/slip44:60',
      amount: 100,
      walletAddress: '0x123',
      paymentMethods: ['/payments/card'],
      providers: ['/providers/blockchain-com', '/providers/transak'],
    });
    if (!opts.queryFn) {
      throw new Error('Expected queryFn to be defined');
    }

    const result = await opts.queryFn({} as never);

    expect(Engine.context.RampsController.getQuotes).toHaveBeenCalledWith(
      expect.objectContaining({
        providers: ['/providers/transak'],
      }),
    );
    expect(result).toEqual({
      success: [{ provider: '/providers/transak' }],
      sorted: [{ sortBy: 'price', ids: ['/providers/transak'] }],
      error: [],
      customActions: [],
    });
  });
});
