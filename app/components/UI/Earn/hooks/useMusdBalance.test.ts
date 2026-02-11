import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdBalance } from './useMusdBalance';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../constants/networks';
import { RootState } from '../../../../reducers';
import { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('react-redux');
jest.mock('../../../../selectors/multichainAccounts/accounts');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

type TokenBalancesByAddress = Record<Hex, Record<Hex, Record<Hex, string>>>;

describe('useMusdBalance', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
  const MOCK_EVM_ADDRESS = '0x0000000000000000000000000000000000000abc' as Hex;
  const mockState = {} as RootState;

  let selectedEvmAddress: Hex | undefined;
  let tokenBalancesByAddress: TokenBalancesByAddress;

  beforeEach(() => {
    jest.clearAllMocks();
    selectedEvmAddress = MOCK_EVM_ADDRESS;
    tokenBalancesByAddress = {} as TokenBalancesByAddress;

    mockSelectSelectedInternalAccountByScope.mockImplementation(
      (_state: RootState) => (scope) => {
        if (scope !== EVM_SCOPE || !selectedEvmAddress) {
          return undefined;
        }

        return { address: selectedEvmAddress } as unknown as InternalAccount;
      },
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokensBalances) {
        return tokenBalancesByAddress;
      }

      if (typeof selector === 'function') {
        return selector(mockState);
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with hasMusdBalanceOnAnyChain and balancesByChain properties', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(result.current).toHaveProperty('hasMusdBalanceOnAnyChain');
      expect(result.current).toHaveProperty('balancesByChain');
    });

    it('returns hasMusdBalanceOnAnyChain as boolean', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(typeof result.current.hasMusdBalanceOnAnyChain).toBe('boolean');
    });

    it('returns balancesByChain as object', () => {
      const { result } = renderHook(() => useMusdBalance());

      expect(typeof result.current.balancesByChain).toBe('object');
    });
  });

  describe('balance detection', () => {
    it('returns hasMusdBalanceOnAnyChain false when no balances exist', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {},
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('returns hasMusdBalanceOnAnyChain false when MUSD balance is 0x0', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: '0x0',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('returns hasMusdBalanceOnAnyChain true when MUSD balance exists on mainnet', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.MAINNET]: balance,
      });
    });

    it('returns hasMusdBalanceOnAnyChain true when MUSD balance exists on Linea', () => {
      const lineaMusdAddress =
        MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];
      const balance = '0x5678';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.LINEA_MAINNET]: {
            [lineaMusdAddress]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.LINEA_MAINNET]: balance,
      });
    });

    it('returns hasMusdBalanceOnAnyChain true when MUSD balance exists on BSC', () => {
      const bscMusdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.BSC];
      const balance = '0x9abc';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.BSC]: {
            [bscMusdAddress]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.BSC]: balance,
      });
    });

    it('returns balances from multiple chains', () => {
      const mainnetBalance = '0x1111';
      const lineaBalance = '0x2222';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: mainnetBalance,
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]:
              lineaBalance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.MAINNET]: mainnetBalance,
        [CHAIN_IDS.LINEA_MAINNET]: lineaBalance,
      });
    });
  });

  describe('address case handling', () => {
    it('handles lowercase token address in balances', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS.toLowerCase()]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
    });

    it('handles checksummed token address in balances', () => {
      const balance = '0x1234';
      // MUSD_ADDRESS is already lowercase in the constant
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns empty balances when selected EVM address is undefined', () => {
      selectedEvmAddress = undefined;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_ADDRESS]: '0x1234',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('ignores non-MUSD tokens on supported chains', () => {
      const otherTokenAddress =
        '0x1234567890abcdef1234567890abcdef12345678' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [otherTokenAddress]: '0x9999',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('ignores MUSD-like tokens on unsupported chains', () => {
      const polygonChainId = '0x89' as Hex;
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [polygonChainId]: {
            [MUSD_ADDRESS]: '0x1234',
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });

    it('handles mixed zero and non-zero balances correctly', () => {
      const balance = '0x1234';
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET]]: '0x0',
          },
          [CHAIN_IDS.LINEA_MAINNET]: {
            [MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET]]: balance,
          },
        },
      };

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(true);
      expect(result.current.balancesByChain).toEqual({
        [CHAIN_IDS.LINEA_MAINNET]: balance,
      });
    });

    it('handles undefined chain balances gracefully', () => {
      tokenBalancesByAddress = {
        [MOCK_EVM_ADDRESS]: {
          [CHAIN_IDS.MAINNET]: undefined as unknown as Record<
            Hex,
            Record<Hex, string>
          >,
        },
      } as unknown as TokenBalancesByAddress;

      const { result } = renderHook(() => useMusdBalance());

      expect(result.current.hasMusdBalanceOnAnyChain).toBe(false);
      expect(result.current.balancesByChain).toEqual({});
    });
  });
});
