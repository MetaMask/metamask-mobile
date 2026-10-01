import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import useMoneyPremiumAccountInterest from './useMoneyPremiumAccountInterest';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_VAULT_ADDRESS = '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7';
const MOCK_QUERY_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
};

function setSelectors({
  address = MOCK_ADDRESS,
  tokenAddress = MOCK_VAULT_ADDRESS,
  paymentType = 'crypto',
  premiumChainId = '0x8f',
}: {
  address?: string;
  tokenAddress?: string;
  paymentType?: 'crypto' | 'card';
  premiumChainId?: string;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }
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

describe('useMoneyPremiumAccountInterest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectors();
    mockUseQuery.mockReturnValue(MOCK_QUERY_RESULT as never);
  });

  it('queries since-inception interest using the premium vault chain id', () => {
    renderHook(() => useMoneyPremiumAccountInterest());

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, {
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
    expect(mockUseQuery).toHaveBeenNthCalledWith(2, {
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
        MOCK_ADDRESS,
      ],
      enabled: true,
    });
  });

  it.each([
    ['account address', { address: '' }],
    ['subscription token address', { tokenAddress: '' }],
    ['premium vault config', { premiumChainId: '' }],
    ['valid premium vault chain id', { premiumChainId: 'invalid' }],
    ['crypto payment method', { paymentType: 'card' as const }],
  ])('disables both queries without a %s', (_label, selectorOverrides) => {
    setSelectors(selectorOverrides);

    renderHook(() => useMoneyPremiumAccountInterest());

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

  it('formats since-inception interest and the matching position APY', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (
        options.queryKey[0] ===
        MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST
      ) {
        return {
          data: { interest_earned_usd: '12.5' },
          isLoading: false,
          isError: false,
        } as never;
      }

      return {
        data: {
          positions: [
            {
              vault_address: MOCK_VAULT_ADDRESS.toLowerCase(),
              current_apy: '0.071',
            },
            {
              vault_address: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
              current_apy: '0.04',
            },
          ],
        },
        isLoading: false,
        isError: false,
      } as never;
    });

    const { result } = renderHook(() => useMoneyPremiumAccountInterest());

    expect(result.current.sinceInceptionInterest).toBe('+$12.50');
    expect(result.current.apyPercent).toBe(7.1);
  });

  it('uses placeholders when interest and APY are unavailable', () => {
    const { result } = renderHook(() => useMoneyPremiumAccountInterest());

    expect(result.current.sinceInceptionInterest).toBe('$0.00');
    expect(result.current.apyPercent).toBeUndefined();
  });
});
