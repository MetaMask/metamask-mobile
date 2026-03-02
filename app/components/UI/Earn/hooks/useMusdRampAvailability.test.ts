import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMusdRampAvailability } from './useMusdRampAvailability';
import { useTokensBuyability } from '../../Ramp/hooks/useTokenBuyability';
import { MUSD_BUYABLE_CHAIN_IDS } from '../constants/musd';

jest.mock('../../Ramp/hooks/useTokenBuyability');

const mockUseTokensBuyability = useTokensBuyability as jest.MockedFunction<
  typeof useTokensBuyability
>;

describe('useMusdRampAvailability', () => {
  const setBuyability = (isBuyableByToken: boolean[]) => {
    mockUseTokensBuyability.mockReturnValue({
      isBuyableByToken,
      isLoading: false,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setBuyability([true, true]);
  });

  it('returns false for all mUSD buyable chains when no tokens are buyable', () => {
    setBuyability([]);

    const { result } = renderHook(() => useMusdRampAvailability());

    MUSD_BUYABLE_CHAIN_IDS.forEach((chainId) => {
      expect(result.current.isMusdBuyableOnChain[chainId]).toBe(false);
    });
    expect(result.current.isMusdBuyableOnAnyChain).toBe(false);
  });

  it('marks remaining chains as not buyable when buyability results are missing', () => {
    setBuyability([true]);

    const { result } = renderHook(() => useMusdRampAvailability());

    expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(true);
    expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.LINEA_MAINNET]).toBe(
      false,
    );
  });

  it('returns true when at least one chain has buyable mUSD', () => {
    setBuyability([false, true]);

    const { result } = renderHook(() => useMusdRampAvailability());

    expect(result.current.isMusdBuyableOnAnyChain).toBe(true);
  });

  it('returns chain-specific buyability when a single chain is selected', () => {
    setBuyability([true, false]);

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.MAINNET as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(true);
  });

  it('returns false when selected chain is not buyable', () => {
    setBuyability([true, false]);

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.LINEA_MAINNET as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(false);
  });

  it('returns false when no chain is selected and popular networks filter is inactive', () => {
    setBuyability([true, true]);

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(null, false);

    expect(isMusdBuyable).toBe(false);
  });

  it('returns false for an unknown chain ID', () => {
    setBuyability([true, true]);

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      '0x999' as Hex,
      false,
    );

    expect(isMusdBuyable).toBe(false);
  });

  it('uses aggregate buyability when popular networks filter is active even with selected chain', () => {
    setBuyability([false, true]);

    const { result } = renderHook(() => useMusdRampAvailability());

    const isMusdBuyable = result.current.getIsMusdBuyable(
      CHAIN_IDS.MAINNET as Hex,
      true,
    );

    expect(isMusdBuyable).toBe(true);
  });
});
