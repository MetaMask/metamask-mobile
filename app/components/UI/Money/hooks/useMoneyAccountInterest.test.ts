import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import Engine from '../../../../core/Engine';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import useMoneyAccountInterest from './useMoneyAccountInterest';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

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

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockMessengerCall = jest.mocked(Engine.controllerMessenger.call);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_VAULT_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const MOCK_QUERY_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
};

function setSelectors({
  address = MOCK_ADDRESS,
  vaultAddress = MOCK_VAULT_ADDRESS,
  chainId = '0x8f',
}: {
  address?: string;
  vaultAddress?: string;
  chainId?: string;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }
    if (selector === selectMoneyAccountVaultConfig) {
      return vaultAddress
        ? {
            boringVault: vaultAddress,
            chainId,
            tellerAddress: '0x1',
            accountantAddress: '0x2',
            lensAddress: '0x3',
          }
        : undefined;
    }
    return undefined;
  });
}

describe('useMoneyAccountInterest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectors();
    mockUseQuery.mockReturnValue(MOCK_QUERY_RESULT as never);
  });

  it('queries the last 30 days and since inception with the vault configuration', () => {
    renderHook(() => useMoneyAccountInterest());

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, {
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        MOCK_ADDRESS,
        {
          vaultAddress: MOCK_VAULT_ADDRESS,
          chainId: 143,
          window: '30d',
        },
      ],
      enabled: true,
    });
    expect(mockUseQuery).toHaveBeenNthCalledWith(2, {
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        MOCK_ADDRESS,
        {
          vaultAddress: MOCK_VAULT_ADDRESS,
          chainId: 143,
          window: 'since_inception',
        },
      ],
      enabled: true,
    });
  });

  it.each([
    ['account address', { address: '' }],
    ['vault configuration', { vaultAddress: '' }],
    ['valid chain ID', { chainId: 'invalid' }],
  ])('disables both queries without a %s', (_label, selectorOverrides) => {
    setSelectors(selectorOverrides);

    renderHook(() => useMoneyAccountInterest());

    expect(mockUseQuery).toHaveBeenCalledTimes(2);
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ enabled: false }),
    );
  });

  it('invalidates the service cache before refetching both UI queries', async () => {
    const callOrder: string[] = [];
    mockMessengerCall.mockImplementation(async () => {
      callOrder.push('service');
      return undefined;
    });
    mockInvalidateQueries.mockImplementation(async () => {
      callOrder.push('ui');
    });
    const { result } = renderHook(() => useMoneyAccountInterest());

    await act(async () => {
      await result.current.refetchInterest();
    });

    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
          MOCK_ADDRESS.toLowerCase(),
          MOCK_VAULT_ADDRESS.toLowerCase(),
        ],
      },
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST,
        MOCK_ADDRESS,
      ],
      refetchType: 'all',
    });
    expect(callOrder).toEqual(['service', 'ui']);
  });

  it('does not invalidate caches when required query parameters are missing', async () => {
    setSelectors({ address: '' });
    const { result } = renderHook(() => useMoneyAccountInterest());

    await act(async () => {
      await result.current.refetchInterest();
    });

    expect(mockMessengerCall).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
