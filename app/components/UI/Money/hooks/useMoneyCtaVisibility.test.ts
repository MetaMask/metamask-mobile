import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type { TokenI } from '../../Tokens/types';
import { isTokenInWildcardList } from '../../Earn/utils/wildcardTokenList';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectIsMoneyTokenListItemCtaEnabledFlag,
  selectMoneyDepositCtaTokens,
} from '../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import { useMoneyDepositTokens } from './useMoneyDepositTokens';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';

jest.mock('react-redux');
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../selectors/moneyAccountController');
jest.mock('../selectors/featureFlags');
jest.mock('../selectors/eligibility');
jest.mock('../../Earn/utils/wildcardTokenList');
jest.mock('./useMoneyDepositTokens');

const mockUseSelector = jest.mocked(useSelector);
const mockIsTokenInWildcardList = jest.mocked(isTokenInWildcardList);
const mockUseMoneyDepositTokens = jest.mocked(useMoneyDepositTokens);

const ctaToken = {
  address: '0xAbC',
  chainId: '0x1',
  symbol: 'USDC',
} as TokenI;

const createToken = (overrides: Partial<TokenI> = {}) =>
  ({ ...ctaToken, ...overrides }) as TokenI;

interface SelectorState {
  ctaEnabled: boolean;
  ctaTokens: Record<string, string[]>;
  geoEligible: boolean;
  vaultConfig: object | undefined;
  primaryMoneyAccount: { address?: string } | undefined;
}

const setupSelectors = ({
  ctaEnabled = true,
  ctaTokens = { '*': ['USDC'] },
  geoEligible = true,
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
    if (selector === selectMoneyDepositCtaTokens) {
      return ctaTokens;
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
    mockIsTokenInWildcardList.mockReturnValue(true);
  });

  it('returns true for an allowlisted earnable token with different address casing', () => {
    const { result } = renderHook(() => useMoneyCtaVisibility());

    const isVisible = result.current.shouldShowMoneyTokenListItemCta(
      createToken({ address: '0xabc', chainId: '0X1' }),
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

  it('returns false when token symbol is absent from configured wildcard list', () => {
    mockIsTokenInWildcardList.mockReturnValue(false);

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
});
