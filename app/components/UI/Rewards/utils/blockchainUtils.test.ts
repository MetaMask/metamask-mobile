/**
 * Unit tests for blockchain utility functions
 */

import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { BlockchainEnum } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  isNonEvmAddress,
  isBtcAccount,
  isTronAccount,
} from '../../../../core/Multichain/utils';
import {
  mapReceivingBlockchainIdToEnum,
  doesAccountMatchBlockchain,
  findMatchingBlockchainAccount,
} from './blockchainUtils';

// Mock external dependencies
jest.mock('@solana/addresses', () => ({
  isAddress: jest.fn(),
}));

jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmAddress: jest.fn(),
  isBtcAccount: jest.fn(),
  isTronAccount: jest.fn(),
}));

const mockIsSolanaAddress = isSolanaAddress as jest.MockedFunction<
  typeof isSolanaAddress
>;
const mockIsNonEvmAddress = isNonEvmAddress as jest.MockedFunction<
  typeof isNonEvmAddress
>;
const mockIsBtcAccount = isBtcAccount as jest.MockedFunction<
  typeof isBtcAccount
>;
const mockIsTronAccount = isTronAccount as jest.MockedFunction<
  typeof isTronAccount
>;

describe('blockchainUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapReceivingBlockchainIdToEnum', () => {
    it('returns BlockchainEnum.EVM for value 1', () => {
      expect(mapReceivingBlockchainIdToEnum(1)).toBe(BlockchainEnum.EVM);
    });

    it('returns BlockchainEnum.SOLANA for value 2', () => {
      expect(mapReceivingBlockchainIdToEnum(2)).toBe(BlockchainEnum.SOLANA);
    });

    it('returns BlockchainEnum.BITCOIN for value 3', () => {
      expect(mapReceivingBlockchainIdToEnum(3)).toBe(BlockchainEnum.BITCOIN);
    });

    it('returns BlockchainEnum.TRON for value 4', () => {
      expect(mapReceivingBlockchainIdToEnum(4)).toBe(BlockchainEnum.TRON);
    });

    it('returns null for invalid blockchain ID', () => {
      expect(mapReceivingBlockchainIdToEnum(999)).toBeNull();
    });

    it('returns null for negative blockchain ID', () => {
      expect(mapReceivingBlockchainIdToEnum(-1)).toBeNull();
    });

    it('returns null for zero', () => {
      expect(mapReceivingBlockchainIdToEnum(0)).toBeNull();
    });
  });

  describe('doesAccountMatchBlockchain', () => {
    const mockAccount = {
      address: '0x123',
    } as InternalAccount;

    describe('EVM blockchain', () => {
      it('returns true when account is EVM', () => {
        mockIsNonEvmAddress.mockReturnValue(false);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.EVM),
        ).toBe(true);
      });

      it('returns false when account is non-EVM', () => {
        mockIsNonEvmAddress.mockReturnValue(true);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.EVM),
        ).toBe(false);
      });
    });

    describe('Solana blockchain', () => {
      it('returns true when account is Solana', () => {
        mockIsSolanaAddress.mockReturnValue(true);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.SOLANA),
        ).toBe(true);
      });

      it('returns false when account is not Solana', () => {
        mockIsSolanaAddress.mockReturnValue(false);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.SOLANA),
        ).toBe(false);
      });
    });

    describe('Bitcoin blockchain', () => {
      it('returns true when account is Bitcoin', () => {
        mockIsBtcAccount.mockReturnValue(true);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.BITCOIN),
        ).toBe(true);
      });

      it('returns false when account is not Bitcoin', () => {
        mockIsBtcAccount.mockReturnValue(false);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.BITCOIN),
        ).toBe(false);
      });
    });

    describe('Tron blockchain', () => {
      it('returns true when account is Tron', () => {
        mockIsTronAccount.mockReturnValue(true);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.TRON),
        ).toBe(true);
      });

      it('returns false when account is not Tron', () => {
        mockIsTronAccount.mockReturnValue(false);

        expect(
          doesAccountMatchBlockchain(mockAccount, BlockchainEnum.TRON),
        ).toBe(false);
      });
    });

    it('returns false for unknown blockchain type', () => {
      expect(
        doesAccountMatchBlockchain(mockAccount, 999 as BlockchainEnum),
      ).toBe(false);
    });
  });

  describe('findMatchingBlockchainAccount', () => {
    const evmAccount = { address: '0x123' } as InternalAccount;
    const solanaAccount = { address: 'sol456' } as InternalAccount;
    const btcAccount = { address: 'bc1abc' } as InternalAccount;

    it('finds first matching EVM account', () => {
      mockIsNonEvmAddress
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      const accounts = [evmAccount, solanaAccount, btcAccount];
      const result = findMatchingBlockchainAccount(
        accounts,
        BlockchainEnum.EVM,
      );

      expect(result).toBe(evmAccount);
    });

    it('finds first matching Solana account', () => {
      mockIsSolanaAddress
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const accounts = [evmAccount, solanaAccount, btcAccount];
      const result = findMatchingBlockchainAccount(
        accounts,
        BlockchainEnum.SOLANA,
      );

      expect(result).toBe(solanaAccount);
    });

    it('finds first matching Bitcoin account', () => {
      mockIsBtcAccount
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const accounts = [evmAccount, solanaAccount, btcAccount];
      const result = findMatchingBlockchainAccount(
        accounts,
        BlockchainEnum.BITCOIN,
      );

      expect(result).toBe(btcAccount);
    });

    it('returns undefined when no matching account found', () => {
      mockIsNonEvmAddress.mockReturnValue(true);

      const accounts = [solanaAccount, btcAccount];
      const result = findMatchingBlockchainAccount(
        accounts,
        BlockchainEnum.EVM,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined for empty accounts array', () => {
      const result = findMatchingBlockchainAccount([], BlockchainEnum.EVM);

      expect(result).toBeUndefined();
    });

    it('handles readonly array', () => {
      mockIsNonEvmAddress.mockReturnValue(false);

      const accounts: readonly InternalAccount[] = [evmAccount];
      const result = findMatchingBlockchainAccount(
        accounts,
        BlockchainEnum.EVM,
      );

      expect(result).toBe(evmAccount);
    });
  });
});
