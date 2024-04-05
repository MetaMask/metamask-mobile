import { containsErrorMessage } from './index';

describe('containsErrorMessage', () => {
  const VAULT_ERROR = 'Cannot unlock without a previous vault.';
  const VAULT_ERROR_CAPS = 'CANNOT UNLOCK WITHOUT A PREVIOUS VAULT.';
  const VAULT_ERROR_LOWERCASE = 'cannot unlock without a previous vault.';
  it('should return true if the error message contains the passed in message', () => {
    const error = new Error(VAULT_ERROR);
    const result = containsErrorMessage(error, VAULT_ERROR);
    expect(result).toBe(true);
  });
  it('should return false if the error message does not contain the passed in message', () => {
    const error = new Error('This is not the error you are looking for.');
    const result = containsErrorMessage(error, VAULT_ERROR);
    expect(result).toBe(false);
  });
  it('should return true if the error contains the message but it is nested', () => {
    const error = new Error(`Error: Error: ${VAULT_ERROR}`);
    const result = containsErrorMessage(error, VAULT_ERROR);
    expect(result).toBe(true);
  });
  it('should return true if the error contains the message wrapped inside another message', () => {
    const error = new Error(
      `Error: Error: ${VAULT_ERROR} This is more text for your enjoyment.`,
    );
    const result = containsErrorMessage(error, VAULT_ERROR);
    expect(result).toBe(true);
  });
  it('should return true if the error contains the passed in message but is in all caps', () => {
    const error = new Error(`Error: Error: ${VAULT_ERROR}`);
    const result = containsErrorMessage(error, VAULT_ERROR_CAPS);
    expect(result).toBe(true);
  });
  it('should return true if the error contains the passed in message but is in all lowercase', () => {
    const error = new Error(`Error: Error: ${VAULT_ERROR_CAPS}`);
    const result = containsErrorMessage(error, VAULT_ERROR_LOWERCASE);
    expect(result).toBe(true);
  });

  it('should return false if the error only contains part of the passed in message', () => {
    const error = new Error(
      `Error: Error: Cannot unlock without a previous state`,
    );
    const result = containsErrorMessage(error, VAULT_ERROR);
    expect(result).toBe(false);
  });
});
