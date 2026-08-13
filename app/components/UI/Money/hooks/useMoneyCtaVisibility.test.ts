import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type { TokenI } from '../../Tokens/types';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectIsMoneyAssetOverviewBalanceCtaEnabledFlag,
  selectIsMoneyAssetOverviewFooterCtaEnabledFlag,
  selectIsMoneyEarnBannerEnabledFlag,
  selectIsMoneyTokenListItemCtaEnabledFlag,
  selectMoneyDepositCtaTokenAddresses,
} from '../selectors/featureFlags';
import { selectMoneyEarnBannerDismissedTokens } from '../../../../reducers/user/selectors';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';

jest.mock('react-redux');
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../selectors/moneyAccountController');
jest.mock('../../../../reducers/user/selectors');
jest.mock('../selectors/featureFlags');
jest.mock('../selectors/eligibility');
jest.mock('./useMoneyDepositTokens');

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyDepositTokens = jest.mocked(useMoneyDepositTokens);

const ctaToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  symbol: 'USDC',
} as TokenI;

const createToken = (overrides: Partial<TokenI> = {}) =>
  ({ ...ctaToken, ...overrides }) as TokenI;

interface SelectorState {
  ctaEnabled: boolean;
  assetOverviewFooterCtaEnabled: boolean;
  assetOverviewBalanceCtaEnabled: boolean;
  ctaTokenAddresses: Record<string, string[]>;
  geoEligible: boolean;
  vaultConfig: object | undefined;
  primaryMoneyAccount: { address?: string } | undefined;
  earnBannerEnabled: boolean;
  earnBannerDismissedTokens: Record<string, boolean>;
}

const setupSelectors = ({
  ctaEnabled = true,
  assetOverviewFooterCtaEnabled = true,
  assetOverviewBalanceCtaEnabled = true,
  ctaTokenAddresses = { '0x1': [ctaToken.address] },
  geoEligible = true,
  earnBannerEnabled = true,
  earnBannerDismissedTokens = {},
  ...options
}: Partial<SelectorState> = {}) => {
  const vaultConfig = 'vaultConfig' in options ? options.vaultConfig : {};
  const primaryMoneyAccount =
    'primaryMoneyAccount' in options
      ? options.primaryMoneyAccount
      : { address: '0xMoneyAccount' };

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyTokenListItemCtaEnabledFlag) {
      return ctaEnabled;
    }
    if (selector === selectIsMoneyAssetOverviewFooterCtaEnabledFlag) {
      return assetOverviewFooterCtaEnabled;
    }
    if (selector === selectIsMoneyAssetOverviewBalanceCtaEnabledFlag) {
      return assetOverviewBalanceCtaEnabled;
    }
    if (selector === selectMoneyDepositCtaTokenAddresses) {
      return ctaTokenAddresses;
    }
    if (selector === selectIsMoneyAccountGeoEligible) {
      return geoEligible;
    }
    if (selector === selectMoneyAccountVaultConfig) {
      return vaultConfig;
    }
    if (selector === selectPrimaryMoneyAccount) {
      return primaryMoneyAccount;
    }
    if (selector === selectIsMoneyEarnBannerEnabledFlag) {
      return earnBannerEnabled;
    }
    if (selector === selectMoneyEarnBannerDismissedTokens) {
      return earnBannerDismissedTokens;
    }
    return undefined;
  });
};

describe('useMoneyCtaVisibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
    mockUseMoneyDepositTokens.mockReturnValue({
      tokens: [ctaToken],
    } as ReturnType<typeof useMoneyDepositTokens>);
  });

  it('returns true for an allowlisted earnable token with different address casing', () => {
    const { result } = renderHook(() => useMoneyCtaVisibility());

    const isVisible = result.current.shouldShowMoneyTokenListItemCta(
      createToken({ address: ctaToken.address.toLowerCase() }),
    );

    expect(isVisible).toBe(true);
  });

  it('returns false when token-list CTA feature flag is disabled', () => {
    setupSelectors({ ctaEnabled: false });

    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(ctaToken)).toBe(
      false,
    );
  });

  it('returns false when user is not geo eligible', () => {
    setupSelectors({ geoEligible: false });

    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(ctaToken)).toBe(
      false,
    );
  });

  it('returns false when vault configuration is unavailable', () => {
    setupSelectors({ vaultConfig: undefined });

    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(ctaToken)).toBe(
      false,
    );
  });

  it('returns false when Money account address is unavailable', () => {
    setupSelectors({ primaryMoneyAccount: {} });

    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(ctaToken)).toBe(
      false,
    );
  });

  it('returns false when token address is absent from configured address list', () => {
    setupSelectors({
      ctaTokenAddresses: {
        '0x1': ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
      },
    });

    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(ctaToken)).toBe(
      false,
    );
  });

  it.each([
    ['asset is undefined', undefined],
    ['asset address is missing', createToken({ address: '' })],
    ['asset chain ID is missing', createToken({ chainId: undefined })],
  ])('returns false when %s', (_description, asset) => {
    const { result } = renderHook(() => useMoneyCtaVisibility());

    expect(result.current.shouldShowMoneyTokenListItemCta(asset)).toBe(false);
  });

  describe('Asset Overview CTAs', () => {
    it('shows footer CTA for an allowlisted token that is not held', () => {
      mockUseMoneyDepositTokens.mockReturnValue({
        isNoFeeToken: jest.fn(),
        tokens: [],
      } as ReturnType<typeof useMoneyDepositTokens>);

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewFooterCta(ctaToken),
      ).toBe(true);
    });

    it('hides footer CTA when its feature flag is disabled', () => {
      setupSelectors({ assetOverviewFooterCtaEnabled: false });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewFooterCta(ctaToken),
      ).toBe(false);
    });

    it('hides footer CTA for a same-symbol asset with another address', () => {
      const customUsdc = createToken({
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewFooterCta(customUsdc),
      ).toBe(false);
    });

    it('hides footer CTA for a configured address on another chain', () => {
      const assetOnAnotherChain = createToken({ chainId: '0xa4b1' });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewFooterCta(
          assetOnAnotherChain,
        ),
      ).toBe(false);
    });

    it('shows balance CTA only for a held deposit-eligible token', () => {
      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewBalanceCta(ctaToken),
      ).toBe(true);
    });

    it('hides balance CTA for a token that is not held', () => {
      mockUseMoneyDepositTokens.mockReturnValue({
        isNoFeeToken: jest.fn(),
        tokens: [],
      } as ReturnType<typeof useMoneyDepositTokens>);

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewBalanceCta(ctaToken),
      ).toBe(false);
    });

    it('hides balance CTA when its feature flag is disabled', () => {
      setupSelectors({ assetOverviewBalanceCtaEnabled: false });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(
        result.current.shouldShowMoneyAssetOverviewBalanceCta(ctaToken),
      ).toBe(false);
    });
  });

  describe('shouldShowMoneyEarnBanner', () => {
    it('returns true for a configured token address when the banner is enabled and the account is ready', () => {
      const { result } = renderHook(() => useMoneyCtaVisibility());

      const isVisible = result.current.shouldShowMoneyEarnBanner(ctaToken);

      expect(isVisible).toBe(true);
    });

    it('returns false when the earn banner feature flag is disabled', () => {
      setupSelectors({ earnBannerEnabled: false });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when user is not geo eligible', () => {
      setupSelectors({ geoEligible: false });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when vault configuration is unavailable', () => {
      setupSelectors({ vaultConfig: undefined });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when Money account address is unavailable', () => {
      setupSelectors({ primaryMoneyAccount: {} });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it.each([
      ['asset is undefined', undefined],
      ['asset address is missing', createToken({ address: '' })],
      ['asset chain ID is missing', createToken({ chainId: undefined })],
    ])('returns false when %s', (_description, asset) => {
      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(asset)).toBe(false);
    });

    it('returns false when no CTA token addresses are configured', () => {
      setupSelectors({ ctaTokenAddresses: {} });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when the token address is not configured', () => {
      setupSelectors({
        ctaTokenAddresses: {
          '0x1': ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
        },
      });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when the token address is configured on another chain', () => {
      setupSelectors({ ctaTokenAddresses: { '0x2105': [ctaToken.address] } });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns false when the token has been dismissed', () => {
      setupSelectors({
        earnBannerDismissedTokens: {
          [`0x1-${ctaToken.address.toLowerCase()}`]: true,
        },
      });

      const { result } = renderHook(() => useMoneyCtaVisibility());

      expect(result.current.shouldShowMoneyEarnBanner(ctaToken)).toBe(false);
    });

    it('returns true for a configured address with a different token symbol', () => {
      const { result } = renderHook(() => useMoneyCtaVisibility());

      const isVisible = result.current.shouldShowMoneyEarnBanner(
        createToken({ symbol: 'MUSD' }),
      );

      expect(isVisible).toBe(true);
    });
  });
});
