import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
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

const MOCK_VAULT_ADDRESS = '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7';
const MOCK_RATE = '1.000000000000000000';
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MOCK_QUERY_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
};

function setSelectors({
  tokenAddress = MOCK_VAULT_ADDRESS,
  paymentType = 'crypto',
  premiumChainId = '0x8f',
}: {
  tokenAddress?: string;
  paymentType?: 'crypto' | 'card';
  premiumChainId?: string;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyAccountPremiumVaultConfig) {
      return premiumChainId
        ? {
            chainId: premiumChainId,
            boringVault: MOCK_VAULT_ADDRESS,
            tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
            accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
            lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
          }
        : undefined;
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

describe('useMoneyPremiumVaultRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectors();
    mockUseQuery.mockReturnValue(MOCK_QUERY_RESULT as never);
  });

  it('queries the premium vault rate using the premium vault chain id', () => {
    renderHook(() => useMoneyPremiumVaultRate());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_RATE,
        MOCK_VAULT_ADDRESS,
        { chainId: 143 },
      ],
      enabled: true,
      refetchInterval: FIVE_MINUTES_MS,
    });
  });

  it.each([
    ['subscription token address', { tokenAddress: '' }],
    ['premium vault config', { premiumChainId: '' }],
    ['valid premium vault chain id', { premiumChainId: 'invalid' }],
    ['crypto payment method', { paymentType: 'card' as const }],
  ])('disables the rate query without a %s', (_label, selectorOverrides) => {
    setSelectors(selectorOverrides);

    renderHook(() => useMoneyPremiumVaultRate());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns the raw rate and a one-decimal percentage', () => {
    mockUseQuery.mockReturnValue({
      data: { rate: MOCK_RATE },
      isLoading: false,
      isError: false,
    } as never);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBe(MOCK_RATE);
    expect(result.current.ratePercent).toBe(100);
    expect(result.current.ratePercentFormatted).toBe('100%');
  });

  it('rounds a fractional rate to one decimal place', () => {
    mockUseQuery.mockReturnValue({
      data: { rate: '0.07149' },
      isLoading: false,
      isError: false,
    } as never);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.ratePercent).toBe(7.1);
    expect(result.current.ratePercentFormatted).toBe('7.1%');
  });

  it('returns no percentage for a rate that is not a number', () => {
    mockUseQuery.mockReturnValue({
      data: { rate: 'not-a-rate' },
      isLoading: false,
      isError: false,
    } as never);

    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBe('not-a-rate');
    expect(result.current.ratePercent).toBeUndefined();
    expect(result.current.ratePercentFormatted).toBeUndefined();
  });

  it('returns no rate when the vault rate query has no data', () => {
    const { result } = renderHook(() => useMoneyPremiumVaultRate());

    expect(result.current.rate).toBeUndefined();
    expect(result.current.ratePercent).toBeUndefined();
    expect(result.current.ratePercentFormatted).toBeUndefined();
  });
});
