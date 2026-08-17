import { renderHook } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import type { Hex } from '@metamask/utils';

import {
  AssetType,
  FIAT_UNAVAILABLE,
  type BalanceChange,
} from '../../../../UI/SimulationDetails/types';
import useBalanceChanges from '../../../../UI/SimulationDetails/useBalanceChanges';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import useHideFiatForTestnet from '../../../../hooks/useHideFiatForTestnet';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD,
  useSendingAssetsFiatTotal,
} from './useSendingAssetsFiatTotal';

jest.mock('../../../../UI/SimulationDetails/useBalanceChanges');
jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../../../hooks/useHideFiatForTestnet');
jest.mock('../transactions/useTransactionMetadataRequest');

const CHAIN_ID = '0x1' as Hex;

const mockUseBalanceChanges = jest.mocked(useBalanceChanges);
const mockUseFiatFormatter = jest.mocked(useFiatFormatter);
const mockUseHideFiatForTestnet = jest.mocked(useHideFiatForTestnet);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

/**
 * Builds a balance change. Negative amounts represent assets leaving the
 * wallet, which is what the hook totals.
 */
function buildBalanceChange({
  amount,
  fiatAmount = 0,
  usdAmount = fiatAmount,
}: {
  amount: number;
  fiatAmount?: number | typeof FIAT_UNAVAILABLE;
  usdAmount?: number | typeof FIAT_UNAVAILABLE;
}): BalanceChange {
  return {
    asset: { type: AssetType.Native, chainId: CHAIN_ID },
    amount: new BigNumber(amount),
    fiatAmount,
    usdAmount,
  } as BalanceChange;
}

function mockBalanceChanges({
  pending = false,
  value = [] as BalanceChange[],
} = {}) {
  mockUseBalanceChanges.mockReturnValue({ pending, value });
}

function mockTransactionMetadata(
  overrides: Record<string, unknown> = {},
): void {
  mockUseTransactionMetadataRequest.mockReturnValue({
    chainId: CHAIN_ID,
    networkClientId: 'mainnet',
    simulationData: { tokenBalanceChanges: [] },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('useSendingAssetsFiatTotal', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockUseHideFiatForTestnet.mockReturnValue(false);
    mockUseFiatFormatter.mockReturnValue(
      (fiatAmount: BigNumber) => `$${fiatAmount.toFixed(2)}`,
    );
    mockTransactionMetadata();
    mockBalanceChanges();
  });

  it('returns the formatted total of outgoing assets', () => {
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: -1.5, fiatAmount: 1234.56 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBe('$1234.56');
  });

  it('sums multiple outgoing assets and ignores incoming ones', () => {
    mockBalanceChanges({
      value: [
        buildBalanceChange({ amount: -1, fiatAmount: 100 }),
        buildBalanceChange({ amount: -2, fiatAmount: 50 }),
        buildBalanceChange({ amount: 3, fiatAmount: 900 }),
      ],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBe('$150.00');
  });

  it('returns null when there is no transaction metadata', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when the confirmation has no simulation data', () => {
    mockTransactionMetadata({ simulationData: undefined });
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: -1, fiatAmount: 100 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when the simulation failed', () => {
    mockTransactionMetadata({
      simulationData: {
        tokenBalanceChanges: [],
        error: { code: 'reverted', message: 'Transaction reverted' },
      },
    });
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: -1, fiatAmount: 100 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null while balance changes are still loading', () => {
    mockBalanceChanges({
      pending: true,
      value: [buildBalanceChange({ amount: -1, fiatAmount: 100 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when fiat is hidden on testnets', () => {
    mockUseHideFiatForTestnet.mockReturnValue(true);
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: -1, fiatAmount: 100 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when no assets are leaving the wallet', () => {
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: 5, fiatAmount: 100 })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when the fiat conversion is unavailable', () => {
    mockBalanceChanges({
      value: [
        buildBalanceChange({
          amount: -1,
          fiatAmount: FIAT_UNAVAILABLE,
          usdAmount: FIAT_UNAVAILABLE,
        }),
      ],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns null when the total exceeds the display ceiling', () => {
    const aboveCeiling = SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD + 1;
    mockBalanceChanges({
      value: [buildBalanceChange({ amount: -1, fiatAmount: aboveCeiling })],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });

  it('returns the total when it sits exactly on the display ceiling', () => {
    mockBalanceChanges({
      value: [
        buildBalanceChange({
          amount: -1,
          fiatAmount: SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD,
        }),
      ],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBe('$10000000.00');
  });

  it('applies the ceiling to the USD total rather than the local-currency total', () => {
    mockBalanceChanges({
      value: [
        buildBalanceChange({
          amount: -1,
          fiatAmount: 1000,
          usdAmount: SENDING_ASSETS_FIAT_DISPLAY_CEILING_USD + 1,
        }),
      ],
    });

    const { result } = renderHook(() => useSendingAssetsFiatTotal());

    expect(result.current).toBeNull();
  });
});
