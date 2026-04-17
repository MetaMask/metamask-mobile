import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useIsSwapEnabledForPriorityToken } from './useIsSwapEnabledForPriorityToken';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { getMemoizedInternalAccountByAddress } from '../../../../selectors/accountsController';

// Solana mainnet chain ID used in cardNetworkInfos
const SOLANA_CAIP_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../constants', () => ({
  cardNetworkInfos: {
    solana: {
      caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  },
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectIsCardAuthenticated: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  getMemoizedInternalAccountByAddress: jest.fn(),
}));

describe('useIsSwapEnabledForPriorityToken', () => {
  const mockEvmAccount = {
    address: '0x1234567890123456789012345678901234567890',
  };

  const mockSolanaAccount = {
    address: 'SolanaAddressHere123456789012345678',
  };

  const mockSelectSelectedInternalAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (
      getMemoizedInternalAccountByAddress as unknown as jest.Mock
    ).mockReturnValue(undefined);

    // Default setup: user is authenticated
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsCardAuthenticated) {
        return true; // Default: authenticated
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return mockSelectSelectedInternalAccount;
      }
      // Anonymous selectors (e.g. getMemoizedInternalAccountByAddress wrapper)
      if (typeof selector === 'function') {
        return selector({});
      }
      return undefined;
    });
  });

  describe('Authentication State', () => {
    it('returns true when user is not authenticated regardless of address match', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectIsCardAuthenticated) {
          return false; // Not authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
        }
        if (typeof selector === 'function') {
          return selector({});
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xDifferentAddress1234567890123456789012',
        ),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when user is not authenticated even with undefined priority token', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectIsCardAuthenticated) {
          return false; // Not authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
        }
        if (typeof selector === 'function') {
          return selector({});
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(undefined),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when user is authenticated and address is not owned by any account', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectIsCardAuthenticated) {
          return true; // Authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
        }
        if (typeof selector === 'function') {
          return selector({});
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xDifferentAddress1234567890123456789012',
        ),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('EVM Account Matching', () => {
    it('returns true when priority token address matches EVM account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when priority token address matches EVM account address with different case', () => {
      const lowercaseEvmAccount = {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return lowercaseEvmAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xaBcDeF1234567890aBcDeF1234567890aBcDeF12',
        ),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when priority token address does not match EVM account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xdifferentaddress0000000000000000000000',
        ),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Solana Account Matching', () => {
    it('returns true when priority token address matches Solana account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === SOLANA_CAIP_CHAIN_ID) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('SolanaAddressHere123456789012345678'),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when priority token address does not match Solana account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === SOLANA_CAIP_CHAIN_ID) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          'DifferentSolanaAddress123456789012345',
        ),
      );

      expect(result.current).toBe(false);
    });

    it('uses case-sensitive comparison for Solana addresses', () => {
      const solanaAccountUpperCase = {
        address: 'SOLANAADDRESSHERE123456789012345678',
      };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === SOLANA_CAIP_CHAIN_ID) {
          return solanaAccountUpperCase;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('solanaaddresshere123456789012345678'),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Owned but Not Selected Account', () => {
    it('returns true when address belongs to a non-selected account', () => {
      const ownedAddress = '0xOwnedButNotSelected00000000000000000000';
      const mockOwnedAccount = { address: ownedAddress };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (
        getMemoizedInternalAccountByAddress as unknown as jest.Mock
      ).mockReturnValue(mockOwnedAccount);

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(ownedAddress),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when address does not belong to any account', () => {
      const unknownAddress = '0xUnknownExternalAddress00000000000000000';

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (
        getMemoizedInternalAccountByAddress as unknown as jest.Mock
      ).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(unknownAddress),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Undefined and Null Cases', () => {
    it('returns false when priority token address is undefined', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        if (scope === SOLANA_CAIP_CHAIN_ID) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(undefined),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when both EVM and Solana accounts are undefined', () => {
      mockSelectSelectedInternalAccount.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(false);
    });
  });
});
