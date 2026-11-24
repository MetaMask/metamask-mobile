import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  VaultSummary,
  VaultsResponse,
} from '@metamask/money-account-api-data-service';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import type { MoneyVaultApyRemoteConfig } from '../selectors/featureFlags.types';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';
import useMoneyVaultApy from './useMoneyVaultApy';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('./useMoneyPremiumVaultRate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockUseMoneyPremiumVaultRate = jest.mocked(useMoneyPremiumVaultRate);

interface QueryState {
  data: VaultsResponse | undefined;
  isLoading: boolean;
  isError?: boolean;
}

interface VaultFixtureOptions {
  vaultKey?: string;
  vaultAddress?: string;
}

interface SetupOptions {
  remoteApyConfig?: MoneyVaultApyRemoteConfig;
  query?: QueryState;
  isEntitled?: boolean;
  premiumRate?: string;
  premiumRateLoading?: boolean;
  premiumVaultAddress?: string;
  baseVaultConfig?: {
    boringVault?: string;
    chainId?: string;
  };
  hasBaseVaultConfig?: boolean;
}

const DEFAULT_REMOTE_APY_CONFIG: MoneyVaultApyRemoteConfig = {
  vaultApyFallback: undefined,
  vaultApyOverride: undefined,
};

const BASE_VAULT_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';

const vault = (
  currentApy: string,
  {
    vaultKey = 'standard',
    vaultAddress = BASE_VAULT_ADDRESS,
  }: VaultFixtureOptions = {},
): VaultSummary => ({
  chain_id: 143,
  vault_address: vaultAddress,
  vault_key: vaultKey,
  name: `${vaultKey} vault`,
  asset_symbol: 'mUSD',
  asset_decimals: 6,
  asset_contract_address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  current_apy: currentApy,
  as_of_block: 1,
  as_of_timestamp: '2026-11-20T00:00:00Z',
  data_freshness: 'live',
  indexer_lag_seconds: 0,
});

const vaultsResponse = (
  currentApy: string,
  options?: VaultFixtureOptions,
): VaultsResponse => ({ vaults: [vault(currentApy, options)] });

const loadedVaults = (...vaults: VaultSummary[]): QueryState => ({
  data: { vaults },
  isLoading: false,
  isError: false,
});

const DEFAULT_QUERY: QueryState = {
  data: vaultsResponse('0.05'),
  isLoading: false,
  isError: false,
};

const PREMIUM_VAULT = '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7';

const setup = ({
  remoteApyConfig = DEFAULT_REMOTE_APY_CONFIG,
  query = DEFAULT_QUERY,
  isEntitled = false,
  premiumRate,
  premiumRateLoading = false,
  premiumVaultAddress,
  baseVaultConfig = {
    boringVault: BASE_VAULT_ADDRESS,
  },
  hasBaseVaultConfig = true,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyVaultApyRemoteConfig) {
      return remoteApyConfig;
    }
    if (selector === selectHasMoneyAccountPremiumApyEntitlement) {
      return isEntitled;
    }
    if (selector === selectMoneyAccountPremiumVaultConfig) {
      return premiumVaultAddress
        ? { boringVault: premiumVaultAddress }
        : undefined;
    }
    if (selector === selectMoneyAccountVaultConfig) {
      return hasBaseVaultConfig ? baseVaultConfig : undefined;
    }
    return undefined;
  });
  mockUseQuery.mockReturnValue(query as never);
  mockUseMoneyPremiumVaultRate.mockReturnValue({
    rate: premiumRate,
    ratePercent: undefined,
    ratePercentFormatted: undefined,
    vaultRateQuery: {
      isLoading: premiumRateLoading,
      isError: false,
      data: premiumRate ? { rate: premiumRate } : undefined,
    },
  } as never);
};

describe('useMoneyVaultApy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('configures the vault APY query with five-minute refetching', () => {
    renderHook(() => useMoneyVaultApy());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [MoneyAccountApiDataServiceQueryKeys.FETCH_VAULTS],
      enabled: true,
      refetchInterval: 5 * 60 * 1000,
    });
  });

  it('disables the vault APY query when disabled', () => {
    renderHook(() => useMoneyVaultApy({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns the base service APY for a non-subscriber', () => {
    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.05);
    expect(result.current.apyPercent).toBe(5);
    expect(result.current.apyPercentFormatted).toBe('5%');
    expect(result.current.baseApyDecimal).toBe(0.05);
    expect(result.current.baseApyPercent).toBe(5);
    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('uses the vault at the configured base vault address', () => {
    setup({
      query: loadedVaults(
        vault('0.03', {
          vaultAddress: '0x0000000000000000000000000000000000000001',
        }),
        vault('0.06', {
          vaultKey: 'custom',
          vaultAddress: BASE_VAULT_ADDRESS.toLowerCase(),
        }),
      ),
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.06);
    expect(result.current.apyPercent).toBe(6);
  });

  it('falls back to the standard vault key when the configured address is absent', () => {
    setup({
      query: loadedVaults(
        vault('0.045', {
          vaultAddress: '0x0000000000000000000000000000000000000002',
        }),
      ),
      baseVaultConfig: {
        boringVault: '0x0000000000000000000000000000000000000003',
      },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.045);
    expect(result.current.apyPercent).toBe(4.5);
  });

  it('falls back to the standard vault key when the base vault config is missing', () => {
    setup({
      query: loadedVaults(
        vault('0.045', {
          vaultAddress: '0x0000000000000000000000000000000000000002',
        }),
      ),
      hasBaseVaultConfig: false,
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.045);
  });

  it('ignores a base vault config without a boring vault', () => {
    setup({
      query: loadedVaults(vault('0.05')),
      baseVaultConfig: { chainId: '0x8f' },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.05);
  });

  it('uses the fallback when the vault catalog is empty', () => {
    setup({
      query: loadedVaults(),
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.04);
  });

  it.each<[string, MoneyVaultApyRemoteConfig, number, number]>([
    [
      'fallback',
      { vaultApyFallback: 0.04, vaultApyOverride: undefined },
      0.04,
      4,
    ],
    ['override', { vaultApyFallback: 0.04, vaultApyOverride: 0.08 }, 0.08, 8],
  ])(
    'uses the %s when no vault matches the base vault',
    (_name, remoteApyConfig, expectedApy, expectedPercent) => {
      setup({
        query: loadedVaults(
          vault('0.05', {
            vaultKey: 'premium',
            vaultAddress: '0x0000000000000000000000000000000000000004',
          }),
        ),
        baseVaultConfig: {
          boringVault: '0x0000000000000000000000000000000000000005',
        },
        remoteApyConfig,
      });

      const { result } = renderHook(() => useMoneyVaultApy());

      expect(result.current.apyDecimal).toBe(expectedApy);
      expect(result.current.apyPercent).toBe(expectedPercent);
    },
  );

  it('leaves APY values undefined while the query is loading', () => {
    setup({
      query: { data: undefined, isLoading: true, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
    expect(result.current.apyPercentFormatted).toBeUndefined();
    expect(result.current.baseApyDecimal).toBeUndefined();
    expect(result.current.isBaseApyLoading).toBe(true);
  });

  it('uses the fallback when the settled query has no service APY', () => {
    setup({
      query: { data: undefined, isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.04);
    expect(result.current.apyPercent).toBe(4);
  });

  it('uses the fallback when the query errors', () => {
    setup({
      query: { data: undefined, isLoading: false, isError: true },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.04);
    expect(result.current.apyPercentFormatted).toBe('4%');
  });

  it('uses the override over the service APY and fallback', () => {
    setup({
      query: { data: vaultsResponse('0.05'), isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0.08 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercent).toBe(8);
  });

  it('preserves a configured zero override', () => {
    setup({
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0);
    expect(result.current.apyPercent).toBe(0);
    expect(result.current.apyPercentFormatted).toBe('0%');
  });

  it('preserves a zero service APY instead of using the fallback', () => {
    setup({
      query: { data: vaultsResponse('0'), isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0);
    expect(result.current.apyPercent).toBe(0);
  });

  it('rounds a high-precision APY to one decimal place using half-up rounding', () => {
    setup({
      query: {
        data: vaultsResponse('0.0377356238130822'),
        isLoading: false,
        isError: false,
      },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyPercent).toBe(3.8);
    expect(result.current.apyPercentFormatted).toBe('3.8%');
  });

  it('does not report the base APY as loading when an override is already set', () => {
    setup({
      query: { data: undefined, isLoading: true, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0.08 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.08);
    expect(result.current.isBaseApyLoading).toBe(false);
  });

  it('reports base APY loading while an entitled user already has a premium rate', () => {
    setup({
      isEntitled: true,
      premiumRate: '0.08',
      query: { data: undefined, isLoading: true, isError: false },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.vaultApyQuery.isLoading).toBe(false);
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.baseApyDecimal).toBeUndefined();
    expect(result.current.isBaseApyLoading).toBe(true);
  });

  it('returns the premium rate for an entitled user', () => {
    setup({
      isEntitled: true,
      premiumRate: '0.08',
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercent).toBe(8);
    expect(result.current.apyPercentFormatted).toBe('8%');
    expect(result.current.baseApyDecimal).toBe(0.05);
    expect(result.current.baseApyPercent).toBe(5);
    expect(result.current.vaultApyQuery.isLoading).toBe(false);
  });

  it('keeps APY undefined while the premium rate loads for an entitled user', () => {
    setup({
      isEntitled: true,
      premiumRate: undefined,
      premiumRateLoading: true,
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
    expect(result.current.vaultApyQuery.isLoading).toBe(true);
  });

  it('returns undefined APY when an entitled user has an unparsable premium rate', () => {
    setup({
      isEntitled: true,
      premiumRate: 'not-a-rate',
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
  });

  it('pauses the premium positions poll when the caller owns that query', () => {
    setup({ isEntitled: true, premiumRate: '0.08' });

    renderHook(() => useMoneyVaultApy({ positionsRefetchInterval: false }));

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: true,
      refetchInterval: false,
    });
  });

  it('disables the premium rate query when the hook is disabled for an entitled user', () => {
    setup({ isEntitled: true, premiumRate: '0.08' });

    renderHook(() => useMoneyVaultApy({ enabled: false }));

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('returns the premium APY for an entitled user whose payment method has no vault address', () => {
    setup({
      isEntitled: true,
      premiumRate: '0.08',
      premiumVaultAddress: PREMIUM_VAULT,
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: true,
      vaultAddress: PREMIUM_VAULT,
    });
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercentFormatted).toBe('8%');
  });
});
