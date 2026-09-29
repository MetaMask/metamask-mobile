import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import { armFreshMoneyBalanceWindow } from '../../../../core/ReactQueryService/moneyBalanceFreshWindow';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import {
  MoneyAccountApiDataServiceQueryKeys,
  MoneyAccountBalanceServiceQueryKeys,
} from '../queryKeys';
import {
  invalidateMoneyAccountBalanceCaches,
  refreshMoneyAccountBalanceFresh,
} from './invalidateMoneyAccountBalanceCaches';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
const mockCancelQueries = jest.fn().mockResolvedValue(undefined);
const mockSetQueryData = jest.fn();
jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
      cancelQueries: (...args: unknown[]) => mockCancelQueries(...args),
      setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    },
  },
}));
jest.mock('../../../../core/ReactQueryService/moneyBalanceFreshWindow', () => ({
  armFreshMoneyBalanceWindow: jest.fn(),
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

const FRESH_BALANCE = {
  musdBalance: '1',
  vmusdValueInMusd: '2',
  totalBalance: '3',
  source: 'api',
  usedFallback: false,
} as CanonicalMoneyAccountBalanceResponse;

describe('refreshMoneyAccountBalanceFresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('busts the RPC cache, fetches with fresh and minBlock, then writes the UI cache', async () => {
    const callOrder: string[] = [];
    mockMessengerCall.mockImplementation((...args: unknown[]) => {
      const method = String(args[0]);
      callOrder.push(method);
      if (method === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
        return Promise.resolve(FRESH_BALANCE);
      }
      return Promise.resolve(undefined);
    });
    mockCancelQueries.mockImplementation(async () => {
      callOrder.push('UI:cancelQueries');
    });
    mockSetQueryData.mockImplementation(() => {
      callOrder.push('UI:setQueryData');
    });

    const result = await refreshMoneyAccountBalanceFresh(MOCK_ADDRESS, {
      minBlock: 42,
    });

    expect(result).toBe(FRESH_BALANCE);
    expect(mockMessengerCall).toHaveBeenNthCalledWith(
      1,
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
          MOCK_ADDRESS,
        ],
      },
    );
    expect(mockMessengerCall).toHaveBeenNthCalledWith(
      2,
      'MoneyAccountBalanceService:fetchBalanceWithFallback',
      MOCK_ADDRESS,
      { fresh: true, minBlock: 42 },
    );
    expect(mockSetQueryData).toHaveBeenCalledWith(
      [
        MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
        MOCK_ADDRESS,
      ],
      FRESH_BALANCE,
    );
    expect(armFreshMoneyBalanceWindow).toHaveBeenCalledWith(MOCK_ADDRESS, 42);
    expect(callOrder).toEqual([
      'UI:cancelQueries',
      'MoneyAccountBalanceService:invalidateQueries',
      'MoneyAccountBalanceService:fetchBalanceWithFallback',
      'UI:cancelQueries',
      'UI:setQueryData',
    ]);
  });

  it('omits minBlock from the facade call when it is undefined', async () => {
    mockMessengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
        return Promise.resolve(FRESH_BALANCE);
      }
      return Promise.resolve(undefined);
    });

    await refreshMoneyAccountBalanceFresh(MOCK_ADDRESS);

    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountBalanceService:fetchBalanceWithFallback',
      MOCK_ADDRESS,
      { fresh: true },
    );
  });

  it('does not write the UI cache when the fresh fetch fails', async () => {
    mockMessengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
        return Promise.reject(new Error('stale'));
      }
      return Promise.resolve(undefined);
    });

    await expect(
      refreshMoneyAccountBalanceFresh(MOCK_ADDRESS, { minBlock: 7 }),
    ).rejects.toThrow('stale');

    expect(mockSetQueryData).not.toHaveBeenCalled();
  });
});
