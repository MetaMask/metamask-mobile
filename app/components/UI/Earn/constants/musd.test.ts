import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isMusdOnMoneyAccountChain,
  isMusdToken,
  isMusdTokenOnChain,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from './musd';

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

describe('isMusdTokenOnChain', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

  it('returns true for the mUSD address on a supported chain', () => {
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.MAINNET)).toBe(true);
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.LINEA_MAINNET)).toBe(
      true,
    );
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.BSC)).toBe(true);
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.MONAD)).toBe(true);
  });

  it('returns false for the mUSD address on an unsupported chain', () => {
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.POLYGON)).toBe(false);
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.ARBITRUM)).toBe(false);
    expect(isMusdTokenOnChain(MUSD_ADDRESS, CHAIN_IDS.OPTIMISM)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(
      isMusdTokenOnChain(MUSD_ADDRESS.toUpperCase(), CHAIN_IDS.MAINNET),
    ).toBe(true);
  });

  it('returns false for missing address or chainId', () => {
    expect(isMusdTokenOnChain(undefined, CHAIN_IDS.MAINNET)).toBe(false);
    expect(isMusdTokenOnChain(MUSD_ADDRESS, undefined)).toBe(false);
  });
});

describe('isMusdOnMoneyAccountChain', () => {
  const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

  it('returns true only for mUSD on Monad', () => {
    expect(isMusdOnMoneyAccountChain(MUSD_ADDRESS, CHAIN_IDS.MONAD)).toBe(true);
  });

  it('returns false for mUSD on chains where mUSD is deployed but the Money Account is not active', () => {
    expect(isMusdOnMoneyAccountChain(MUSD_ADDRESS, CHAIN_IDS.MAINNET)).toBe(
      false,
    );
    expect(
      isMusdOnMoneyAccountChain(MUSD_ADDRESS, CHAIN_IDS.LINEA_MAINNET),
    ).toBe(false);
    expect(isMusdOnMoneyAccountChain(MUSD_ADDRESS, CHAIN_IDS.BSC)).toBe(false);
  });

  it('returns false for missing arguments', () => {
    expect(isMusdOnMoneyAccountChain(undefined, CHAIN_IDS.MONAD)).toBe(false);
    expect(isMusdOnMoneyAccountChain(MUSD_ADDRESS, undefined)).toBe(false);
  });

  it('returns false for a non-mUSD address on Monad', () => {
    expect(
      isMusdOnMoneyAccountChain(
        '0x1234567890123456789012345678901234567890',
        CHAIN_IDS.MONAD,
      ),
    ).toBe(false);
  });
});
