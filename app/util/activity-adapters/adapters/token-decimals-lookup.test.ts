import {
  findKnownTokenDecimals,
  toHexChainId,
  type TokenDecimalsLookupState,
} from './token-decimals-lookup';

describe('toHexChainId', () => {
  it('converts a CAIP-2 chain id to hex', () => {
    expect(toHexChainId('eip155:56')).toBe('0x38');
    expect(toHexChainId('eip155:1')).toBe('0x1');
  });

  it('lowercases an already-hex chain id', () => {
    expect(toHexChainId('0xA4B1')).toBe('0xa4b1');
  });

  it('returns undefined for non-EVM chain ids', () => {
    expect(toHexChainId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(
      undefined,
    );
  });
});

describe('findKnownTokenDecimals', () => {
  const contractAddress = '0x55d398326f99059fF775485246999027B3197955';

  const state: TokenDecimalsLookupState = {
    allTokens: {
      '0x38': {
        '0xAccountA': [
          { address: contractAddress.toLowerCase(), decimals: 18 },
        ],
      },
    },
    allDetectedTokens: {
      '0xa4b1': {
        '0xAccountA': [{ address: '0xDetected', decimals: '6' }],
      },
    },
  };

  it('finds imported-token decimals for the chain, case-insensitively', () => {
    expect(findKnownTokenDecimals(state, 'eip155:56', contractAddress)).toBe(
      18,
    );
  });

  it('falls back to detected tokens and normalizes string decimals', () => {
    expect(findKnownTokenDecimals(state, '0xA4B1', '0xdetected')).toBe(6);
  });

  it('returns undefined when the token is unknown on the chain', () => {
    expect(findKnownTokenDecimals(state, 'eip155:1', contractAddress)).toBe(
      undefined,
    );
  });

  it('ignores invalid decimals values', () => {
    const invalid: TokenDecimalsLookupState = {
      allTokens: {
        '0x38': {
          '0xAccountA': [
            { address: contractAddress, decimals: 'not-a-number' },
          ],
        },
      },
    };
    expect(findKnownTokenDecimals(invalid, 'eip155:56', contractAddress)).toBe(
      undefined,
    );
  });

  it('returns undefined for missing state or non-EVM chains', () => {
    expect(
      findKnownTokenDecimals(undefined, 'eip155:56', contractAddress),
    ).toBe(undefined);
    expect(
      findKnownTokenDecimals(state, 'solana:mainnet', contractAddress),
    ).toBe(undefined);
  });
});
