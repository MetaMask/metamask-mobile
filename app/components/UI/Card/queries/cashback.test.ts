import Engine from '../../../../core/Engine';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCashbackWallet: jest.fn(),
      getCashbackWithdrawEstimation: jest.fn(),
    },
  },
}));

const mockGetCashbackWallet = Engine.context.CardController
  .getCashbackWallet as jest.Mock;
const mockGetCashbackWithdrawEstimation = Engine.context.CardController
  .getCashbackWithdrawEstimation as jest.Mock;

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
  beforeEach(() => jest.clearAllMocks());

  it('returns correct queryKey and staleTime', () => {
    const opts = cashbackWalletOptions();

    expect(opts.queryKey).toEqual(['card', 'cashback', 'wallet']);
    expect(opts.staleTime).toBe(0);
  });

  it('calls Engine.context.CardController.getCashbackWallet in queryFn', async () => {
    const mockResponse = {
      id: 'w1',
      balance: '10.50',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    mockGetCashbackWallet.mockResolvedValue(mockResponse);

    const { queryFn } = cashbackWalletOptions();
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockGetCashbackWallet).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });
});

describe('cashbackWithdrawEstimationOptions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns disabled options', () => {
    const opts = cashbackWithdrawEstimationOptions();
    expect(opts.enabled).toBe(false);
  });

  it('returns the correct query key', () => {
    const opts = cashbackWithdrawEstimationOptions();
    expect(opts.queryKey).toEqual(['card', 'cashback', 'withdraw-estimation']);
  });

  it('calls Engine.context.CardController.getCashbackWithdrawEstimation in queryFn', async () => {
    const mockEstimation = {
      wei: '4648201084656',
      eth: '0.000004648201084656',
      price: '0.00892136699188968037536',
    };
    mockGetCashbackWithdrawEstimation.mockResolvedValue(mockEstimation);

    const { queryFn } = cashbackWithdrawEstimationOptions();
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockGetCashbackWithdrawEstimation).toHaveBeenCalled();
    expect(result).toEqual(mockEstimation);
  });
});
