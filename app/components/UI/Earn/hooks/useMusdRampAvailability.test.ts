import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMusdRampAvailability } from './useMusdRampAvailability';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../constants/musd';

jest.mock('../../Ramp/hooks/useRampTokens');

const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;

describe('useMusdRampAvailability', () => {
  const createMusdRampToken = (
    chainId: Hex,
    tokenSupported = true,
  ): RampsToken => {
    const assetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId].toLowerCase();
    const caipChainId = assetId.split('/')[0] as `${string}:${string}`;
    return {
      assetId: assetId as `${string}:${string}/${string}:${string}`,
      symbol: 'MUSD',
      chainId: caipChainId,
      tokenSupported,
      name: 'MetaMask USD',
      decimals: 6,
      iconUrl: 'https://example.com/musd.png',
    };
  };

  const defaultRampTokens = {
    topTokens: null,
    allTokens: [
      createMusdRampToken(CHAIN_IDS.MAINNET as Hex),
      createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex),
    ],
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampTokens.mockReturnValue(defaultRampTokens);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with all required properties', () => {
      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current).toHaveProperty('isMusdBuyableOnChain');
      expect(result.current).toHaveProperty('isMusdBuyableOnAnyChain');
      expect(result.current).toHaveProperty('getIsMusdBuyable');
    });

    it('returns getIsMusdBuyable as a function', () => {
      const { result } = renderHook(() => useMusdRampAvailability());

      expect(typeof result.current.getIsMusdBuyable).toBe('function');
    });
  });

  describe('isMusdBuyableOnChain', () => {
    it('returns empty object when allTokens is null', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: null,
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain).toEqual({});
    });

    it('returns buyability status for each chain', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, true),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, false),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(true);
      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.LINEA_MAINNET]).toBe(
        false,
      );
    });

    it('returns false for chain when token not supported', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, false),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, false),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(
        false,
      );
      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.LINEA_MAINNET]).toBe(
        false,
      );
    });
  });

  describe('isMusdBuyableOnAnyChain', () => {
    it('returns true when at least one chain has buyable mUSD', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, false),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, true),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnAnyChain).toBe(true);
    });

    it('returns false when no chains have buyable mUSD', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, false),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, false),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnAnyChain).toBe(false);
    });

    it('returns false when allTokens is empty', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnAnyChain).toBe(false);
    });
  });

  describe('getIsMusdBuyable', () => {
    it('returns isMusdBuyableOnAnyChain when popular networks filter is active', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, false),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, true),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(null, true);

      expect(isMusdBuyable).toBe(true);
    });

    it('returns chain-specific buyability when single chain selected', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, true),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, false),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(
        CHAIN_IDS.MAINNET as Hex,
        false,
      );

      expect(isMusdBuyable).toBe(true);
    });

    it('returns false when selected chain not buyable', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET as Hex, true),
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET as Hex, false),
        ],
      });

      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(
        CHAIN_IDS.LINEA_MAINNET as Hex,
        false,
      );

      expect(isMusdBuyable).toBe(false);
    });

    it('returns false when no chain selected and popular networks filter is inactive', () => {
      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(null, false);

      expect(isMusdBuyable).toBe(false);
    });

    it('returns false for unknown chain ID', () => {
      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(
        '0x999' as Hex,
        false,
      );

      expect(isMusdBuyable).toBe(false);
    });
  });

  describe('integration with useRampTokens', () => {
    it('calls useRampTokens hook', () => {
      renderHook(() => useMusdRampAvailability());

      expect(mockUseRampTokens).toHaveBeenCalled();
    });
  });
});
