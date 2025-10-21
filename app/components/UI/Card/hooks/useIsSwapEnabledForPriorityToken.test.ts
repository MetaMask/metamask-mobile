import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useIsSwapEnabledForPriorityToken } from './useIsSwapEnabledForPriorityToken';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../Ramp/Deposit/constants/networks', () => ({
  SOLANA_MAINNET: {
    chainId: 'solana:mainnet',
  },
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
  });

  describe('EVM Account Matching', () => {
    it('returns true when priority token address matches EVM account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

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

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

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

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

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
        if (scope === 'eip155:0') {
          return undefined;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('SolanaAddressHere123456789012345678'),
      );

      expect(result.current).toBe(true);
    });

    it('returns false when priority token address does not match Solana account address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return undefined;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

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
        if (scope === 'eip155:0') {
          return undefined;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return solanaAccountUpperCase;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('solanaaddresshere123456789012345678'),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Multiple Account Support', () => {
    it('returns true when priority token matches either EVM or Solana account', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when priority token matches Solana account even if EVM account exists', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('SolanaAddressHere123456789012345678'),
      );

      expect(result.current).toBe(true);
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

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(undefined),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when EVM account is undefined and Solana account is undefined', () => {
      mockSelectSelectedInternalAccount.mockImplementation(() => undefined);

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when EVM account is undefined but Solana account exists and addresses do not match', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return undefined;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when EVM account address is undefined', () => {
      const evmAccountWithoutAddress = { address: undefined };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return evmAccountWithoutAddress;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0x1234567890123456789012345678901234567890',
        ),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when Solana account address is undefined', () => {
      const solanaAccountWithoutAddress = { address: undefined };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return undefined;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return solanaAccountWithoutAddress;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken('SolanaAddressHere123456789012345678'),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string as priority token address', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() => useIsSwapEnabledForPriorityToken(''));

      expect(result.current).toBe(false);
    });

    it('returns true when both addresses are empty strings (edge case)', () => {
      const emptyEvmAccount = { address: '' };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return emptyEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() => useIsSwapEnabledForPriorityToken(''));

      expect(result.current).toBe(true);
    });

    it('performs case-insensitive comparison for mixed case EVM addresses', () => {
      const mixedCaseEvmAccount = {
        address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      };

      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mixedCaseEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xabcdef1234567890abcdef1234567890abcdef12',
        ),
      );

      expect(result.current).toBe(true);
    });

    it('returns false for very long address strings that do not match', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xverylongstringthatdoesnotmatchtheaccountaddress',
        ),
      );

      expect(result.current).toBe(false);
    });

    it('handles accounts with both EVM and Solana addresses when neither matches', () => {
      mockSelectSelectedInternalAccount.mockImplementation((scope) => {
        if (scope === 'eip155:0') {
          return mockEvmAccount;
        }
        if (scope === SOLANA_MAINNET.chainId) {
          return mockSolanaAccount;
        }
        return undefined;
      });

      (useSelector as jest.Mock).mockReturnValue(
        mockSelectSelectedInternalAccount,
      );

      const { result } = renderHook(() =>
        useIsSwapEnabledForPriorityToken(
          '0xcompletelyifferentaddress1234567890',
        ),
      );

      expect(result.current).toBe(false);
    });
  });
});
