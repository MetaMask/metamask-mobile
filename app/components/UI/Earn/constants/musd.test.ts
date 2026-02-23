import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isMusdToken, MUSD_TOKEN_ADDRESS_BY_CHAIN } from './musd';

describe('isMusdToken', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

  it('returns true for mUSD token address in lowercase', () => {
    const result = isMusdToken(MUSD_ADDRESS);

    expect(result).toBe(true);
  });

  it('returns true for mUSD token address in uppercase', () => {
    const result = isMusdToken(MUSD_ADDRESS.toUpperCase());

    expect(result).toBe(true);
  });

  it('returns true for mUSD token address with mixed case', () => {
    const mixedCaseAddress = '0xAcA92E438df0B2401fF60dA7E4337B687a2435DA';

    const result = isMusdToken(mixedCaseAddress);

    expect(result).toBe(true);
  });

  it('returns false for non-mUSD token address', () => {
    const otherAddress = '0x1234567890123456789012345678901234567890';

    const result = isMusdToken(otherAddress);

    expect(result).toBe(false);
  });

  it('returns false for undefined address', () => {
    const result = isMusdToken(undefined);

    expect(result).toBe(false);
  });

  it('returns false for empty string address', () => {
    const result = isMusdToken('');

    expect(result).toBe(false);
  });
});
