import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useMusdRampAvailability } from './useMusdRampAvailability';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import useRampsTokens from '../../Ramp/hooks/useRampsTokens';
import useRampsUnifiedV2Enabled from '../../Ramp/hooks/useRampsUnifiedV2Enabled';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../constants/musd';

jest.mock('../../Ramp/hooks/useRampTokens');
jest.mock('../../Ramp/hooks/useRampsTokens');
jest.mock('../../Ramp/hooks/useRampsUnifiedV2Enabled');

const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;
const mockUseRampsTokens = useRampsTokens as jest.MockedFunction<
  typeof useRampsTokens
>;
const mockUseRampsUnifiedV2Enabled =
  useRampsUnifiedV2Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV2Enabled
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

  const createControllerTokens = (allTokens: RampsToken[]) => ({
    topTokens: [],
    allTokens,
  });

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
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    mockUseRampTokens.mockReturnValue(defaultRampTokens);
    mockUseRampsTokens.mockReturnValue({
      tokens: null,
      isLoading: false,
      error: null,
      fetchTokens: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns an object with required properties', () => {
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
    it('returns empty object when legacy allTokens is null', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: null,
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain).toEqual({});
    });

    it('returns buyability status for each chain from legacy tokens', () => {
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

    it('returns false for a chain when mUSD tokenSupported is false', () => {
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

    it('returns chain-specific buyability when a single chain is selected', () => {
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

    it('returns false when selected chain is not buyable', () => {
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

    it('returns false when no chain is selected and popular networks filter is inactive', () => {
      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(null, false);

      expect(isMusdBuyable).toBe(false);
    });

    it('returns false for an unknown chain ID', () => {
      const { result } = renderHook(() => useMusdRampAvailability());
      const isMusdBuyable = result.current.getIsMusdBuyable(
        '0x999' as Hex,
        false,
      );

      expect(isMusdBuyable).toBe(false);
    });
  });

  describe('token source selection', () => {
    it('uses controller tokens when unified v2 is enabled', () => {
      mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [createMusdRampToken(CHAIN_IDS.MAINNET as Hex, false)],
      });
      mockUseRampsTokens.mockReturnValue({
        tokens: createControllerTokens([
          createMusdRampToken(CHAIN_IDS.MAINNET),
        ]),
        isLoading: false,
        error: null,
        fetchTokens: jest.fn(),
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(true);
      expect(mockUseRampTokens).toHaveBeenCalledWith({ fetchOnMount: false });
    });

    it('uses legacy tokens when unified v2 is disabled', () => {
      mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [createMusdRampToken(CHAIN_IDS.MAINNET as Hex, true)],
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain[CHAIN_IDS.MAINNET]).toBe(true);
      expect(mockUseRampTokens).toHaveBeenCalledWith({ fetchOnMount: true });
    });

    it('returns no buyability when unified v2 is enabled and tokens are null', () => {
      mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
      mockUseRampsTokens.mockReturnValue({
        tokens: null,
        isLoading: false,
        error: null,
        fetchTokens: jest.fn(),
      });

      const { result } = renderHook(() => useMusdRampAvailability());

      expect(result.current.isMusdBuyableOnChain).toEqual({});
      expect(result.current.isMusdBuyableOnAnyChain).toBe(false);
      expect(mockUseRampTokens).toHaveBeenCalledWith({ fetchOnMount: false });
    });
  });
});
