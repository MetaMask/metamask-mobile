import { CardSDK } from '../sdk/CardSDK';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';

describe('cashbackKeys', () => {
  it('returns the base key for all cashback queries', () => {
    expect(cashbackKeys.all()).toEqual(['card', 'cashback']);
  });

  it('returns the wallet query key', () => {
    expect(cashbackKeys.wallet()).toEqual(['card', 'cashback', 'wallet']);
  });

  it('returns the withdraw estimation query key', () => {
    expect(cashbackKeys.withdrawEstimation()).toEqual([
      'card',
      'cashback',
      'withdraw-estimation',
    ]);
  });
});

describe('cashbackWalletOptions', () => {
  const mockSdk = {
    getCashbackWallet: jest.fn(),
  } as unknown as CardSDK;

  it('returns disabled options when sdk is null', () => {
    const opts = cashbackWalletOptions(null);

    expect(opts.queryKey).toEqual(['card', 'cashback', 'wallet']);
    expect(opts.enabled).toBe(false);
    expect(opts.staleTime).toBe(0);
  });

  it('returns enabled options when sdk is provided', () => {
    const opts = cashbackWalletOptions(mockSdk);

    expect(opts.queryKey).toEqual(['card', 'cashback', 'wallet']);
    expect(opts.enabled).toBe(true);
    expect(opts.staleTime).toBe(0);
  });

  it('calls sdk.getCashbackWallet in queryFn', async () => {
    const mockResponse = {
      id: 'w1',
      balance: '10.50',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(mockResponse);

    const { queryFn } = cashbackWalletOptions(mockSdk);
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockSdk.getCashbackWallet).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it('throws when sdk is null and queryFn is invoked', async () => {
    const { queryFn } = cashbackWalletOptions(null);
    if (!queryFn) throw new Error('queryFn should be defined');

    await expect(queryFn({} as never)).rejects.toThrow('CardSDK not available');
  });
});

describe('cashbackWithdrawEstimationOptions', () => {
  const mockSdk = {
    getCashbackWithdrawEstimation: jest.fn(),
  } as unknown as CardSDK;

  it('returns disabled options regardless of sdk', () => {
    const withSdk = cashbackWithdrawEstimationOptions(mockSdk);
    const withoutSdk = cashbackWithdrawEstimationOptions(null);

    expect(withSdk.enabled).toBe(false);
    expect(withoutSdk.enabled).toBe(false);
  });

  it('returns the correct query key', () => {
    const opts = cashbackWithdrawEstimationOptions(mockSdk);

    expect(opts.queryKey).toEqual(['card', 'cashback', 'withdraw-estimation']);
  });

  it('calls sdk.getCashbackWithdrawEstimation in queryFn', async () => {
    const mockEstimation = {
      wei: '4648201084656',
      eth: '0.000004648201084656',
      price: '0.00892136699188968037536',
    };
    (mockSdk.getCashbackWithdrawEstimation as jest.Mock).mockResolvedValue(
      mockEstimation,
    );

    const { queryFn } = cashbackWithdrawEstimationOptions(mockSdk);
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockSdk.getCashbackWithdrawEstimation).toHaveBeenCalled();
    expect(result).toEqual(mockEstimation);
  });

  it('throws when sdk is null and queryFn is invoked', async () => {
    const { queryFn } = cashbackWithdrawEstimationOptions(null);
    if (!queryFn) throw new Error('queryFn should be defined');

    await expect(queryFn({} as never)).rejects.toThrow('CardSDK not available');
  });
});
