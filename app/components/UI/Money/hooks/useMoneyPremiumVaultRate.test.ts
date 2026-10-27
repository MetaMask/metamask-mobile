import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_VAULT_ADDRESS = '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7';
const OTHER_VAULT_ADDRESS = '0x1111111111111111111111111111111111111111';
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MOCK_QUERY_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
};

function setSelectors({
  address = MOCK_ADDRESS,
  tokenAddress = MOCK_VAULT_ADDRESS,
  paymentType = 'crypto',
}: {
  address?: string;
  tokenAddress?: string;
  paymentType?: 'crypto' | 'card';
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }
    if (selector === selectMoneyAccountPlusSubscription) {
      if (paymentType === 'card') {
        return {
          paymentMethod: {
            type: 'card',
            card: { brand: 'visa', last4: '1234' },
          },
        };
      }
      return tokenAddress
        ? {
            paymentMethod: {
              type: 'crypto',
              crypto: {
                payerAddress: '0x15ffacc73fce2323d469df2cd23251e3e104352e',
                chainId: '0x1',
                tokenSymbol: 'pvmUSD',
                tokenAddress,
              },
            },
          }
        : {
            paymentMethod: {
              type: 'crypto',
              crypto: {
                payerAddress: '0x15ffacc73fce2323d469df2cd23251e3e104352e',
                chainId: '0x1',
                tokenSymbol: 'pvmUSD',
              },
            },
          };
    }
    return undefined;
  });
}

function mockPositions(
  positions: { vault_address: string; current_apy: string }[],
) {
  mockUseQuery.mockReturnValue({
    data: { positions },
    isLoading: false,
    isError: false,
  } as never);
}

describe('useMoneyPremiumVaultRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectors();
    mockUseQuery.mockReturnValue(MOCK_QUERY_RESULT as never);
  });

  it('queries positions for the lowercased money account address', () => {
    renderHook(() => useMoneyPremiumVaultRate());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
        MOCK_ADDRESS.toLowerCase(),
      ],
      enabled: true,
      refetchInterval: FIVE_MINUTES_MS,
    });
  });

  it.each([
    ['money account address', { address: '' }],
    ['subscription token address', { tokenAddress: '' }],
    ['crypto payment method', { paymentType: 'card' as const }],
  ])(
    'disables the positions query without a %s',
    (_label, selectorOverrides) => {
      setSelectors(selectorOverrides);

      renderHook(() => useMoneyPremiumVaultRate());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it('returns the premium position APY as a one-decimal percentage', () => {
    mockPositions([
      { vault_address: OTHER_VAULT_ADDRESS, current_apy: '0.04' },
      { vault_address: MOCK_VAULT_ADDRESS, current_apy: '0.07' },
    ]);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBe('0.07');
    expect(result.current.ratePercent).toBe(7);
    expect(result.current.ratePercentFormatted).toBe('7%');
  });

  it('matches the premium vault address regardless of casing', () => {
    setSelectors({ tokenAddress: MOCK_VAULT_ADDRESS.toUpperCase() });
    mockPositions([
      {
        vault_address: MOCK_VAULT_ADDRESS.toLowerCase(),
        current_apy: '0.07',
      },
    ]);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.ratePercentFormatted).toBe('7%');
  });

  it('rounds a fractional APY to one decimal place', () => {
    mockPositions([
      { vault_address: MOCK_VAULT_ADDRESS, current_apy: '0.07149' },
    ]);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.ratePercent).toBe(7.1);
    expect(result.current.ratePercentFormatted).toBe('7.1%');
  });

  it('returns no percentage when the premium position is absent', () => {
    mockPositions([
      { vault_address: OTHER_VAULT_ADDRESS, current_apy: '0.04' },
    ]);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBeUndefined();
    expect(result.current.ratePercent).toBeUndefined();
    expect(result.current.ratePercentFormatted).toBeUndefined();
  });

  it('returns no percentage for an APY that is not a number', () => {
    mockPositions([
      { vault_address: MOCK_VAULT_ADDRESS, current_apy: 'not-an-apy' },
    ]);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBe('not-an-apy');
    expect(result.current.ratePercent).toBeUndefined();
    expect(result.current.ratePercentFormatted).toBeUndefined();
  });

  it.each([
    ['card payment', { paymentType: 'card' as const }],
    ['crypto payment without a token address', { tokenAddress: '' }],
  ])(
    'reads the premium APY from the fallback vault for a %s',
    (_label, selectorOverrides) => {
      setSelectors(selectorOverrides);
      mockPositions([
        { vault_address: MOCK_VAULT_ADDRESS, current_apy: '0.07' },
      ]);

      const { result } = renderHook(() =>
        useMoneyPremiumVaultRate({ vaultAddress: MOCK_VAULT_ADDRESS }),
      );

      expect(result.current.rate).toBe('0.07');
      expect(result.current.ratePercentFormatted).toBe('7%');
    },
  );

  it('prefers the crypto payment token over the fallback vault', () => {
    mockPositions([
      { vault_address: MOCK_VAULT_ADDRESS, current_apy: '0.07' },
      { vault_address: OTHER_VAULT_ADDRESS, current_apy: '0.04' },
    ]);

    const { result } = renderHook(() =>
      useMoneyPremiumVaultRate({ vaultAddress: OTHER_VAULT_ADDRESS }),
    );

    expect(result.current.rate).toBe('0.07');
  });

  it('disables the positions query when enabled is false', () => {
    renderHook(() => useMoneyPremiumVaultRate({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns no rate when the positions query has no data', () => {
    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBeUndefined();
    expect(result.current.ratePercent).toBeUndefined();
    expect(result.current.ratePercentFormatted).toBeUndefined();
  });
});
