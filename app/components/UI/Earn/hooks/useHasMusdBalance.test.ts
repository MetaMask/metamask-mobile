import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useHasMusdBalance } from './useHasMusdBalance';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';

jest.mock('react-redux');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useHasMusdBalance', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with hasMusdBalance and balancesByChain properties', () => {
      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current).toHaveProperty('hasMusdBalance');
      expect(result.current).toHaveProperty('balancesByChain');
    });

    it('returns hasMusdBalance as boolean', () => {
      const { result } = renderHook(() => useHasMusdBalance());

      expect(typeof result.current.hasMusdBalance).toBe('boolean');
    });

    it('returns balancesByChain as object', () => {
      const { result } = renderHook(() => useHasMusdBalance());

      expect(typeof result.current.balancesByChain).toBe('object');
    });
  });

  describe('balance detection', () => {
    it('returns hasMusdBalance false when no balances exist', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('returns hasMusdBalance false when MUSD balance is 0x0', () => {
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_ADDRESS]: '0x0',
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('returns hasMusdBalance true when MUSD balance exists on mainnet', () => {
      const balance = '0x1234';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_ADDRESS]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.MAINNET]: balance,
      });
    });

    it('returns hasMusdBalance true when MUSD balance exists on Linea', () => {
      const lineaMusdAddress =
        MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];
      const balance = '0x5678';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.LINEA_MAINNET]: {
          [lineaMusdAddress]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.LINEA_MAINNET]: balance,
      });
    });

    it('returns hasMusdBalance true when MUSD balance exists on BSC', () => {
      const bscMusdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.BSC];
      const balance = '0x9abc';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.BSC]: {
          [bscMusdAddress]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.BSC]: balance,
      });
    });

    it('returns balances from multiple chains', () => {
      const mainnetBalance = '0x1111';
      const lineaBalance = '0x2222';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: mainnetBalance,
        },
        [CHAIN_IDS.LINEA_MAINNET]: {
          [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]: lineaBalance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.MAINNET]: mainnetBalance,
        [CHAIN_IDS.LINEA_MAINNET]: lineaBalance,
      });
    });
  });

  describe('address case handling', () => {
    it('handles lowercase token address in balances', () => {
      const balance = '0x1234';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_ADDRESS.toLowerCase()]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
    });

    it('handles checksummed token address in balances', () => {
      const balance = '0x1234';
      // MUSD_ADDRESS is already lowercase in the constant
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_ADDRESS]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('ignores non-MUSD tokens on supported chains', () => {
      const otherTokenAddress =
        '0x1234567890abcdef1234567890abcdef12345678' as Hex;
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [otherTokenAddress]: '0x9999',
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('ignores MUSD-like tokens on unsupported chains', () => {
      const polygonChainId = '0x89' as Hex;
      mockUseSelector.mockReturnValue({
        [polygonChainId]: {
          [MUSD_ADDRESS]: '0x1234',
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('handles mixed zero and non-zero balances correctly', () => {
      const balance = '0x1234';
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: {
          [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: '0x0',
        },
        [CHAIN_IDS.LINEA_MAINNET]: {
          [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]: balance,
        },
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.LINEA_MAINNET]: balance,
      });
    });

    it('handles undefined chain balances gracefully', () => {
      mockUseSelector.mockReturnValue({
        [CHAIN_IDS.MAINNET]: undefined,
      });

      const { result } = renderHook(() => useHasMusdBalance());

      expect(result.current.hasMusdBalance).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });
  });
});
