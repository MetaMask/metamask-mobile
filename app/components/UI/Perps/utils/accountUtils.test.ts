/**
 * Unit tests for Perps account utilities
 * Tests EVM account filtering and selection helpers
 */
import { createMockEngineContext } from '../__mocks__';

// Mock Engine
const mockEngineContext = createMockEngineContext();
jest.mock('../../../../core/Engine', () => ({ context: mockEngineContext }));

import { getEvmAccountFromSelectedAccountGroup } from './accountUtils';
import Engine from '../../../../core/Engine';

describe('accountUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure Engine.context is properly mocked
    (Engine as unknown as { context: typeof mockEngineContext }).context =
      mockEngineContext;
  });

  describe('getEvmAccountFromSelectedAccountGroup', () => {
    it('returns EVM account when found in account group', () => {
      // Arrange
      const mockAccounts = [
        {
          address: '0x1234567890123456789012345678901234567890',
          id: 'account-1',
          type: 'btc:p2pkh',
          metadata: { name: 'Bitcoin Account' },
        },
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          id: 'account-2',
          type: 'eip155:eoa',
          metadata: { name: 'Ethereum Account' },
        },
        {
          address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
          id: 'account-3',
          type: 'cosmos:secp256k1',
          metadata: { name: 'Cosmos Account' },
        },
      ];

      mockEngineContext.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        mockAccounts,
      );

      // Act
      const result = getEvmAccountFromSelectedAccountGroup();

      // Assert
      expect(result).toEqual({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        id: 'account-2',
        type: 'eip155:eoa',
        metadata: { name: 'Ethereum Account' },
      });
      expect(
        mockEngineContext.AccountTreeController
          .getAccountsFromSelectedAccountGroup,
      ).toHaveBeenCalledTimes(1);
    });

    it('returns null when no EVM account exists in account group', () => {
      // Arrange
      const mockAccounts = [
        {
          address: '0x1234567890123456789012345678901234567890',
          id: 'account-1',
          type: 'btc:p2pkh',
          metadata: { name: 'Bitcoin Account' },
        },
        {
          address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
          id: 'account-2',
          type: 'cosmos:secp256k1',
          metadata: { name: 'Cosmos Account' },
        },
      ];

      mockEngineContext.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        mockAccounts,
      );

      // Act
      const result = getEvmAccountFromSelectedAccountGroup();

      // Assert
      expect(result).toBeNull();
      expect(
        mockEngineContext.AccountTreeController
          .getAccountsFromSelectedAccountGroup,
      ).toHaveBeenCalledTimes(1);
    });

    it('returns null when account group is empty', () => {
      // Arrange
      mockEngineContext.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        [],
      );

      // Act
      const result = getEvmAccountFromSelectedAccountGroup();

      // Assert
      expect(result).toBeNull();
      expect(
        mockEngineContext.AccountTreeController
          .getAccountsFromSelectedAccountGroup,
      ).toHaveBeenCalledTimes(1);
    });

    it('returns first EVM account when multiple EVM accounts exist', () => {
      // Arrange
      const mockAccounts = [
        {
          address: '0x1111111111111111111111111111111111111111',
          id: 'account-1',
          type: 'eip155:eoa',
          metadata: { name: 'First EVM Account' },
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          id: 'account-2',
          type: 'eip155:eoa',
          metadata: { name: 'Second EVM Account' },
        },
        {
          address: '0x3333333333333333333333333333333333333333',
          id: 'account-3',
          type: 'eip155:contract',
          metadata: { name: 'Third EVM Account' },
        },
      ];

      mockEngineContext.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        mockAccounts,
      );

      // Act
      const result = getEvmAccountFromSelectedAccountGroup();

      // Assert
      expect(result).toEqual({
        address: '0x1111111111111111111111111111111111111111',
        id: 'account-1',
        type: 'eip155:eoa',
        metadata: { name: 'First EVM Account' },
      });
      expect(
        mockEngineContext.AccountTreeController
          .getAccountsFromSelectedAccountGroup,
      ).toHaveBeenCalledTimes(1);
    });

    it('correctly identifies EVM accounts by type prefix', () => {
      // Arrange
      const mockAccounts = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          id: 'account-1',
          type: 'eip155:eoa',
          metadata: { name: 'EVM EOA' },
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          id: 'account-2',
          type: 'eip155:contract',
          metadata: { name: 'EVM Contract' },
        },
        {
          address: '0xcccccccccccccccccccccccccccccccccccccccc',
          id: 'account-3',
          type: 'eip155:custom',
          metadata: { name: 'EVM Custom' },
        },
      ];

      mockEngineContext.AccountTreeController.getAccountsFromSelectedAccountGroup.mockReturnValue(
        mockAccounts,
      );

      // Act
      const result = getEvmAccountFromSelectedAccountGroup();

      // Assert - Should return first EVM account (any subtype starting with 'eip155:')
      expect(result).toEqual({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        id: 'account-1',
        type: 'eip155:eoa',
        metadata: { name: 'EVM EOA' },
      });
    });
  });
});
