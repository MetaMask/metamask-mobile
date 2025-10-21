import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useIsSwapEnabledForPriorityToken } from './useIsSwapEnabledForPriorityToken';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../Ramp/Deposit/constants/networks', () => ({
  SOLANA_MAINNET: {
    chainId: 'solana:mainnet',
  },
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectIsAuthenticatedCard: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
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

    // Default setup: user is authenticated
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectIsAuthenticatedCard) {
        return true; // Default: authenticated
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return mockSelectSelectedInternalAccount;
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
        if (selector === selectIsAuthenticatedCard) {
          return false; // Not authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
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
        if (selector === selectIsAuthenticatedCard) {
          return false; // Not authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(undefined),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when user is authenticated and addresses do not match', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectIsAuthenticatedCard) {
          return true; // Authenticated
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return mockSelectSelectedInternalAccount;
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
        if (scope === SOLANA_MAINNET.chainId) {
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
        if (scope === SOLANA_MAINNET.chainId) {
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
        if (scope === SOLANA_MAINNET.chainId) {
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

  describe('Undefined and Null Cases', () => {
    it('returns false when priority token address is undefined', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        if (scope === SOLANA_MAINNET.chainId) {
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
