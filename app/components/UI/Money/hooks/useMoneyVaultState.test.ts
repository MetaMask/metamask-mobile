import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';
import useMoneyVaultApy from './useMoneyVaultApy';
import useMoneyVaultState, {
  getVaultPositionsRefetchInterval,
} from './useMoneyVaultState';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('./useMoneyPremiumVaultRate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseMoneyPremiumVaultRate = jest.mocked(useMoneyPremiumVaultRate);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);
const mockMessengerCall = jest.mocked(Engine.controllerMessenger.call);

const BASE_VAULT = '0xBaseVault';
const PREMIUM_VAULT = '0xPremiumVault';
const ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

describe('getVaultPositionsRefetchInterval', () => {
  it('pauses polling when the network tier is NONE', () => {
    expect(getVaultPositionsRefetchInterval(true, 'NONE', 'HIGH')).toBe(false);
  });

  it('uses five minutes when not migrating', () => {
    expect(getVaultPositionsRefetchInterval(false, 'WIFI', 'HIGH')).toBe(
      5 * 60 * 1000,
    );
  });

  it('uses sixty seconds on SLOW_CELLULAR while migrating', () => {
    expect(
      getVaultPositionsRefetchInterval(true, 'SLOW_CELLULAR', 'HIGH'),
    ).toBe(60 * 1000);
  });

  it('uses sixty seconds on LOW hardware while migrating', () => {
    expect(getVaultPositionsRefetchInterval(true, 'WIFI', 'LOW')).toBe(
      60 * 1000,
    );
  });

  it('uses thirty seconds while migrating on a fast path', () => {
    expect(getVaultPositionsRefetchInterval(true, 'WIFI', 'HIGH')).toBe(
      30 * 1000,
    );
  });

  it('treats a null network tier as the product default, not offline', () => {
    expect(getVaultPositionsRefetchInterval(true, null, 'HIGH')).toBe(
      30 * 1000,
    );
  });
});

describe('useMoneyVaultState', () => {
  const setup = ({
    isEntitled = false,
    address = ADDRESS as string | null,
    positions,
    positionsLoading = false,
    positionsError = false,
    baseApyDecimal = 0.05,
    premiumRate = '0.08' as string | undefined,
    premiumRateLoading = false,
    networkTier = 'WIFI' as ReturnType<typeof useNetworkTier>,
    hardwareTier = 'HIGH' as ReturnType<typeof getHardwareTier>,
  }: {
    isEntitled?: boolean;
    /** Pass `null` to simulate no Money account (undefined would hit the default). */
    address?: string | null;
    positions?:
      | {
          vault_address: string;
          vault_key: string;
          current_value_usd: string;
        }[]
      | undefined;
    positionsLoading?: boolean;
    positionsError?: boolean;
    baseApyDecimal?: number;
    premiumRate?: string | undefined;
    premiumRateLoading?: boolean;
    networkTier?: ReturnType<typeof useNetworkTier>;
    hardwareTier?: ReturnType<typeof getHardwareTier>;
  } = {}) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectHasMoneyAccountPremiumApyEntitlement) {
        return isEntitled;
      }
      if (selector === selectPrimaryMoneyAccount) {
        return address ? { address } : undefined;
      }
      if (selector === selectMoneyAccountVaultConfig) {
        return { boringVault: BASE_VAULT, chainId: '0x8f' };
      }
      if (selector === selectMoneyAccountPremiumVaultConfig) {
        return { boringVault: PREMIUM_VAULT, chainId: '0x8f' };
      }
      return undefined;
    });
    mockUseNetworkTier.mockReturnValue(networkTier);
    mockGetHardwareTier.mockReturnValue(hardwareTier);
    mockUseMoneyVaultApy.mockReturnValue({
      baseApyDecimal,
    } as ReturnType<typeof useMoneyVaultApy>);
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
    mockUseQuery.mockReturnValue({
      data:
        positions === undefined
          ? undefined
          : { positions, address: address?.toLowerCase() },
      isLoading: positionsLoading,
      isError: positionsError,
    } as never);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('falls back to the entitlement while positions are loading', () => {
    setup({
      isEntitled: true,
      positions: undefined,
      positionsLoading: true,
      premiumRate: '0.08',
    });

    const { result } = renderHook(() => useMoneyVaultState());

    expect(result.current.status).toBe('premium');
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercent).toBe(8);
    expect(result.current.isLoading).toBe(true);
  });

  it('falls back to the entitlement when the positions query errors with no cache', () => {
    setup({
      isEntitled: false,
      positions: undefined,
      positionsError: true,
    });

    const { result } = renderHook(() => useMoneyVaultState());

    expect(result.current.status).toBe('base');
    expect(result.current.apyDecimal).toBe(0.05);
  });

  it('keeps cached positions when a positions refetch errors', () => {
    setup({
      isEntitled: false,
      positions: [
        {
          vault_address: PREMIUM_VAULT,
          vault_key: 'premium',
          current_value_usd: '100',
        },
      ],
      positionsError: true,
      premiumRate: '0.08',
    });

    const { result } = renderHook(() => useMoneyVaultState());

    expect(result.current.status).toBe('downgrading');
    expect(result.current.apyDecimal).toBe(0.08);
  });

  it('returns upgrading with the base APY when entitled funds are still in base', async () => {
    setup({
      isEntitled: true,
      positions: [
        {
          vault_address: BASE_VAULT,
          vault_key: 'standard',
          current_value_usd: '100',
        },
      ],
    });

    const { result } = renderHook(() => useMoneyVaultState());

    expect(result.current.status).toBe('upgrading');
    expect(result.current.currentVault).toBe('base');
    expect(result.current.apyDecimal).toBe(0.05);
    expect(result.current.apyPercent).toBe(5);

    await waitFor(() => {
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ refetchInterval: 30 * 1000 }),
      );
    });
  });

  it('enables the premium rate when downgrading with funds still in premium', () => {
    setup({
      isEntitled: false,
      positions: [
        {
          vault_address: PREMIUM_VAULT,
          vault_key: 'premium',
          current_value_usd: '100',
        },
      ],
      premiumRate: '0.08',
    });

    const { result } = renderHook(() => useMoneyVaultState());

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(result.current.status).toBe('downgrading');
    expect(result.current.apyDecimal).toBe(0.08);
  });

  it('configures the positions query with the lowercased address', () => {
    renderHook(() => useMoneyVaultState());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
        ADDRESS.toLowerCase(),
      ],
      enabled: true,
      refetchInterval: 5 * 60 * 1000,
    });
  });

  it('pauses positions polling when the network tier is NONE', () => {
    setup({ networkTier: 'NONE' });

    renderHook(() => useMoneyVaultState());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: false }),
    );
  });

  it('invalidates positions when the entitlement flips', () => {
    setup({ isEntitled: false });
    const { rerender } = renderHook(() => useMoneyVaultState());

    setup({ isEntitled: true });
    act(() => {
      rerender(undefined);
    });

    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          ADDRESS.toLowerCase(),
        ],
      },
    );
  });

  it('disables the positions query when there is no Money account address', () => {
    setup({ address: null });

    renderHook(() => useMoneyVaultState());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
        undefined as unknown as string,
      ],
      enabled: false,
      refetchInterval: 5 * 60 * 1000,
    });
  });
});
