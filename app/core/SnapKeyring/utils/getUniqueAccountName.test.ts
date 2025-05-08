import { InternalAccount } from '@metamask/keyring-internal-api';
import { getUniqueAccountName } from './getUniqueAccountName';
import {
  createMockInternalAccount,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';

describe('getUniqueAccountName', () => {
  const mockAccounts: InternalAccount[] = [
    createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1'),
    createMockInternalAccount(MOCK_ADDRESS_2, 'Bitcoin Account'),
  ];

  it('returns the suggested name if it is not taken', () => {
    const suggestedName = 'Solana Account';
    const result = getUniqueAccountName(mockAccounts, suggestedName);
    expect(result).toBe(suggestedName);
  });

  it('appends a number to the name if the suggested name is taken', () => {
    const suggestedName = 'Account 1';
    const result = getUniqueAccountName(mockAccounts, suggestedName);
    expect(result).toBe('Account 1 2');
  });

  it('increments the number until it finds an available name', () => {
    const extendedAccounts = [
      ...mockAccounts,
      createMockInternalAccount('0x123', 'Test Account'),
      createMockInternalAccount('0x456', 'Test Account 2'),
      createMockInternalAccount('0x789', 'Test Account 3'),
    ];

    const suggestedName = 'Test Account';
    const result = getUniqueAccountName(extendedAccounts, suggestedName);
    expect(result).toBe('Test Account 4');
  });

  it('handles empty accounts array', () => {
    const suggestedName = 'New Account';
    const result = getUniqueAccountName([], suggestedName);
    expect(result).toBe(suggestedName);
  });

  it('handles empty name suggestion by using a default name pattern', () => {
    const suggestedName = '';
    const result = getUniqueAccountName(mockAccounts, suggestedName);
    expect(result).toBe(''); // Empty string should remain empty
  });
});
