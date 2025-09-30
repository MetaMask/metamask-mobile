import {
  handleRewardsErrorMessage,
  SOLANA_SIGNUP_NOT_SUPPORTED,
  convertInternalAccountToCaipAccountId,
  formatAccountScope,
} from './utils';
import { parseCaipChainId, toCaipAccountId } from '@metamask/utils';
import Logger from '../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock external dependencies
jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  toCaipAccountId: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock keyring-api and Multichain utils for formatAccountScope
jest.mock('@metamask/keyring-api', () => ({
  isEvmAccountType: jest.fn(),
}));
jest.mock('../../../core/Multichain/utils', () => ({
  isSolanaAccount: jest.fn(),
}));

const mockParseCaipChainId = parseCaipChainId as jest.MockedFunction<
  typeof parseCaipChainId
>;
const mockToCaipAccountId = toCaipAccountId as jest.MockedFunction<
  typeof toCaipAccountId
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const { isEvmAccountType } = jest.requireMock('@metamask/keyring-api') as {
  isEvmAccountType: jest.Mock;
};
const { isSolanaAccount } = jest.requireMock(
  '../../../core/Multichain/utils',
) as { isSolanaAccount: jest.Mock };

describe('Rewards Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertInternalAccountToCaipAccountId', () => {
    const mockAccount: InternalAccount = {
      id: 'test-account-id',
      address: '0x1234567890123456789012345678901234567890',
      scopes: ['eip155:1'],
      type: 'eip155:eoa',
      options: {},
      methods: [],
      metadata: {
        name: 'Test Account',
        keyring: { type: 'HD Key Tree' },
        importTime: Date.now(),
      },
    };

    describe('successful conversion', () => {
      it('should convert Ethereum account to CAIP account ID successfully', () => {
        // Arrange
        const expectedNamespace = 'eip155';
        const expectedReference = '1';
        const expectedCaipAccountId =
          'eip155:1:0x1234567890123456789012345678901234567890';

        mockParseCaipChainId.mockReturnValue({
          namespace: expectedNamespace,
          reference: expectedReference,
        });
        mockToCaipAccountId.mockReturnValue(expectedCaipAccountId);

        // Act
        const result = convertInternalAccountToCaipAccountId(mockAccount);

        // Assert
        expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          expectedNamespace,
          expectedReference,
          mockAccount.address,
        );
        expect(result).toBe(expectedCaipAccountId);
        expect(mockLogger.log).not.toHaveBeenCalled();
      });

      it('should convert Solana account to CAIP account ID successfully', () => {
        // Arrange
        const solanaAccount: InternalAccount = {
          ...mockAccount,
          address: '11111111111111111111111111111112',
          scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        };
        const expectedNamespace = 'solana';
        const expectedReference = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        const expectedCaipAccountId =
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:11111111111111111111111111111112';

        mockParseCaipChainId.mockReturnValue({
          namespace: expectedNamespace,
          reference: expectedReference,
        });
        mockToCaipAccountId.mockReturnValue(expectedCaipAccountId);

        // Act
        const result = convertInternalAccountToCaipAccountId(solanaAccount);

        // Assert
        expect(mockParseCaipChainId).toHaveBeenCalledWith(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        );
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          expectedNamespace,
          expectedReference,
          solanaAccount.address,
        );
        expect(result).toBe(expectedCaipAccountId);
        expect(mockLogger.log).not.toHaveBeenCalled();
      });

      it('should use the first scope when account has multiple scopes', () => {
        // Arrange
        const multiScopeAccount: InternalAccount = {
          ...mockAccount,
          scopes: ['eip155:1', 'eip155:137', 'eip155:56'],
        };
        const expectedNamespace = 'eip155';
        const expectedReference = '1';
        const expectedCaipAccountId =
          'eip155:1:0x1234567890123456789012345678901234567890';

        mockParseCaipChainId.mockReturnValue({
          namespace: expectedNamespace,
          reference: expectedReference,
        });
        mockToCaipAccountId.mockReturnValue(expectedCaipAccountId);

        // Act
        const result = convertInternalAccountToCaipAccountId(multiScopeAccount);

        // Assert
        expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          expectedNamespace,
          expectedReference,
          multiScopeAccount.address,
        );
        expect(result).toBe(expectedCaipAccountId);
      });
    });

    describe('error handling', () => {
      it('should return null and log error when parseCaipChainId throws', () => {
        // Arrange
        const parseError = new Error('Invalid CAIP chain ID format');
        mockParseCaipChainId.mockImplementation(() => {
          throw parseError;
        });

        // Act
        const result = convertInternalAccountToCaipAccountId(mockAccount);

        // Assert
        expect(result).toBeNull();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'RewardsUtils: Failed to convert address to CAIP-10 format:',
          parseError,
        );
        expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
        expect(mockToCaipAccountId).not.toHaveBeenCalled();
      });

      it('should return null and log error when toCaipAccountId throws', () => {
        // Arrange
        const convertError = new Error('Invalid account address format');
        mockParseCaipChainId.mockReturnValue({
          namespace: 'eip155',
          reference: '1',
        });
        mockToCaipAccountId.mockImplementation(() => {
          throw convertError;
        });

        // Act
        const result = convertInternalAccountToCaipAccountId(mockAccount);

        // Assert
        expect(result).toBeNull();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'RewardsUtils: Failed to convert address to CAIP-10 format:',
          convertError,
        );
        expect(mockParseCaipChainId).toHaveBeenCalledWith('eip155:1');
        expect(mockToCaipAccountId).toHaveBeenCalledWith(
          'eip155',
          '1',
          mockAccount.address,
        );
      });
    });
  });

  describe('SOLANA_SIGNUP_NOT_SUPPORTED constant', () => {
    it('should export the correct message for Solana signup not supported', () => {
      // Arrange & Act & Assert
      expect(SOLANA_SIGNUP_NOT_SUPPORTED).toBe(
        'Signing in to Rewards with Solana accounts is not supported yet. Please use an Ethereum account instead.',
      );
    });
  });

  describe('handleRewardsErrorMessage', () => {
    describe('when error is not an object', () => {
      it('should return default error message for null error', () => {
        // Arrange
        const error = null;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for string error', () => {
        // Arrange
        const error = 'some string error';

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for number error', () => {
        // Arrange
        const error = 123;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for boolean error', () => {
        // Arrange
        const error = true;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });
    });

    describe('when error object has no message', () => {
      it('should return default error message for empty object', () => {
        // Arrange
        const error = {};

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message when both data.message and message are undefined', () => {
        // Arrange
        const error = { someOtherProperty: 'value' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message when data.message is empty string', () => {
        // Arrange
        const error = { data: { message: '' } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });
    });

    describe('when error contains "already registered"', () => {
      it('should return account already registered message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'User is already registered with this account' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'This account is already registered with another Rewards profile. Please switch account to continue.',
        );
      });

      it('should return account already registered message for direct message', () => {
        // Arrange
        const error = { message: 'Account already registered in system' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'This account is already registered with another Rewards profile. Please switch account to continue.',
        );
      });
    });

    describe('when error contains "rejected the request"', () => {
      it('should return rejection message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'User rejected the request from the application' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('You rejected the request.');
      });

      it('should return rejection message for direct message', () => {
        // Arrange
        const error = { message: 'The user rejected the request' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('You rejected the request.');
      });
    });

    describe('when error contains "No keyring found"', () => {
      it('should return Solana not supported message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'No keyring found for this account' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(SOLANA_SIGNUP_NOT_SUPPORTED);
      });

      it('should return Solana not supported message for direct message', () => {
        // Arrange
        const error = { message: 'No keyring found' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(SOLANA_SIGNUP_NOT_SUPPORTED);
      });
    });

    describe('when error contains service unavailable indicators', () => {
      it('should return service unavailable message for "not available"', () => {
        // Arrange
        const error = { data: { message: 'Service not available' } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'Service is not available at the moment. Please try again shortly.',
        );
      });

      it('should return service unavailable message for "Network request failed"', () => {
        // Arrange
        const error = { message: 'Network request failed due to timeout' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'Service is not available at the moment. Please try again shortly.',
        );
      });
    });

    describe('when error has custom message not matching specific cases', () => {
      it('should return the original message from data.message', () => {
        // Arrange
        const customMessage = 'Custom API error occurred';
        const error = { data: { message: customMessage } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(customMessage);
      });

      it('should return the original message from direct message', () => {
        // Arrange
        const customMessage = 'Validation failed for input';
        const error = { message: customMessage };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(customMessage);
      });

      it('should prioritize data.message over direct message', () => {
        // Arrange
        const dataMessage = 'Error from data.message';
        const directMessage = 'Error from message';
        const error = {
          data: { message: dataMessage },
          message: directMessage,
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(dataMessage);
      });

      it('should fall back to direct message when data.message is undefined', () => {
        // Arrange
        const directMessage = 'Error from direct message';
        const error = {
          data: {},
          message: directMessage,
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(directMessage);
      });
    });

    describe('error message matching is case sensitive', () => {
      it('should not match "ALREADY REGISTERED" in uppercase', () => {
        // Arrange
        const error = { message: 'USER ALREADY REGISTERED' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('USER ALREADY REGISTERED');
      });

      it('should not match "REJECTED THE REQUEST" in uppercase', () => {
        // Arrange
        const error = { message: 'USER REJECTED THE REQUEST' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('USER REJECTED THE REQUEST');
      });
    });
  });

  describe('formatAccountScope', () => {
    const baseAccount: InternalAccount = {
      id: 'acct-1',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      scopes: ['eip155:1'],
      type: 'eip155:eoa',
      options: {},
      methods: [],
      metadata: {
        name: 'Account 1',
        keyring: { type: 'HD Key Tree' },
        importTime: Date.now(),
      },
    };

    beforeEach(() => {
      isEvmAccountType.mockReset();
      isSolanaAccount.mockReset();
    });

    it('returns "evm" when account is EVM type', () => {
      isEvmAccountType.mockReturnValue(true);
      isSolanaAccount.mockReturnValue(false);
      const result = formatAccountScope(baseAccount);
      expect(result).toBe('evm');
      expect(isEvmAccountType).toHaveBeenCalledWith(baseAccount.type);
      expect(isSolanaAccount).not.toHaveBeenCalled();
    });

    it('returns "solana" when account is not EVM but is Solana', () => {
      isEvmAccountType.mockReturnValue(false);
      isSolanaAccount.mockReturnValue(true);
      // Use a valid solana account type from allowed union
      const solAccount: InternalAccount = {
        ...baseAccount,
        type: 'solana:data-account',
      };
      const result = formatAccountScope(solAccount);
      expect(result).toBe('solana');
      expect(isEvmAccountType).toHaveBeenCalledWith(solAccount.type);
      expect(isSolanaAccount).toHaveBeenCalledWith(solAccount);
    });

    it('falls back to account.type when neither EVM nor Solana', () => {
      isEvmAccountType.mockReturnValue(false);
      isSolanaAccount.mockReturnValue(false);
      // Use a valid non-evm non-solana account type (e.g., Tron)
      const customAccount: InternalAccount = {
        ...baseAccount,
        type: 'tron:eoa',
      };
      const result = formatAccountScope(customAccount);
      expect(result).toBe('tron:eoa');
      expect(isEvmAccountType).toHaveBeenCalledWith(customAccount.type);
      expect(isSolanaAccount).toHaveBeenCalledWith(customAccount);
    });
  });
});
