import Engine from '../../../../core/Engine';
import {
  creditKeys,
  creditWalletOptions,
  creditWithdrawEstimationOptions,
} from './credit';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCreditWallet: jest.fn(),
      getCreditWithdrawEstimation: jest.fn(),
    },
  },
}));

const mockGetCreditWallet = Engine.context.CardController
  .getCreditWallet as jest.Mock;
const mockGetCreditWithdrawEstimation = Engine.context.CardController
  .getCreditWithdrawEstimation as jest.Mock;

describe('creditKeys', () => {
  it('returns the base key for all credit queries', () => {
    expect(creditKeys.all()).toEqual(['card', 'credit']);
  });

  it('returns the wallet query key', () => {
    expect(creditKeys.wallet()).toEqual(['card', 'credit', 'wallet']);
  });

  it('returns the withdraw estimation query key', () => {
    expect(creditKeys.withdrawEstimation()).toEqual([
      'card',
      'credit',
      'withdraw-estimation',
    ]);
  });
});

describe('creditWalletOptions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns correct queryKey and staleTime', () => {
    const opts = creditWalletOptions();

    expect(opts.queryKey).toEqual(['card', 'credit', 'wallet']);
    expect(opts.staleTime).toBe(30_000);
  });

  it('calls Engine.context.CardController.getCreditWallet in queryFn', async () => {
    const mockResponse = {
      id: 'w1',
      balance: '10.50',
      currency: 'usdc',
      isWithdrawable: true,
      type: 'credit',
    };
    mockGetCreditWallet.mockResolvedValue(mockResponse);

    const { queryFn } = creditWalletOptions();
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockGetCreditWallet).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });
});

describe('creditWithdrawEstimationOptions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns disabled options', () => {
    const opts = creditWithdrawEstimationOptions();
    expect(opts.enabled).toBe(false);
  });

  it('calls Engine.context.CardController.getCreditWithdrawEstimation in queryFn', async () => {
    const mockEstimation = {
      wei: '1',
      eth: '0.001',
      price: '0.5',
      network: 'linea',
    };
    mockGetCreditWithdrawEstimation.mockResolvedValue(mockEstimation);

    const { queryFn } = creditWithdrawEstimationOptions();
    if (!queryFn) throw new Error('queryFn should be defined');
    const result = await queryFn({} as never);

    expect(mockGetCreditWithdrawEstimation).toHaveBeenCalled();
    expect(result).toEqual(mockEstimation);
  });
});
