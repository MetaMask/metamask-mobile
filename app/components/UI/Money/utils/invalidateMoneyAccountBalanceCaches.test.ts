import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import {
  MoneyAccountApiDataServiceQueryKeys,
  MoneyAccountBalanceServiceQueryKeys,
} from '../queryKeys';
import { invalidateMoneyAccountBalanceCaches } from './invalidateMoneyAccountBalanceCaches';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

const mockMessengerCall = jest.mocked(Engine.controllerMessenger.call);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

describe('invalidateMoneyAccountBalanceCaches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates both source service caches via messenger before the UI facade', async () => {
    const callOrder: string[] = [];
    mockMessengerCall.mockImplementation((...args: unknown[]) => {
      callOrder.push(String(args[0]));
      return Promise.resolve(undefined);
    });
    mockInvalidateQueries.mockImplementation(async () => {
      callOrder.push('UI:invalidateQueries');
    });

    await invalidateMoneyAccountBalanceCaches(MOCK_ADDRESS);

    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
          MOCK_ADDRESS,
        ],
      },
    );
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          MOCK_ADDRESS.toLowerCase(),
        ],
      },
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
        MOCK_ADDRESS,
      ],
      refetchType: 'all',
    });

    // Source caches must be cleared before the facade refetch runs.
    expect(
      callOrder.indexOf('MoneyAccountBalanceService:invalidateQueries'),
    ).toBeLessThan(callOrder.indexOf('UI:invalidateQueries'));
    expect(
      callOrder.indexOf('MoneyAccountApiDataService:invalidateQueries'),
    ).toBeLessThan(callOrder.indexOf('UI:invalidateQueries'));
  });

  it('lowercases the address for the Money API positions query key', async () => {
    await invalidateMoneyAccountBalanceCaches(MOCK_ADDRESS);

    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:invalidateQueries',
      expect.objectContaining({
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          MOCK_ADDRESS.toLowerCase(),
        ],
      }),
    );
  });
});
