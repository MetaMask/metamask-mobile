import { parsePayWithToken } from './parsePayWithToken';

describe('parsePayWithToken', () => {
  it('returns null for null', () => {
    expect(parsePayWithToken(null)).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(parsePayWithToken('string')).toBeNull();
    expect(parsePayWithToken(123)).toBeNull();
    expect(parsePayWithToken(undefined)).toBeNull();
  });

  it('returns null for array', () => {
    expect(parsePayWithToken([])).toBeNull();
    expect(parsePayWithToken([{ address: '0x', chainId: '0x1' }])).toBeNull();
  });

  it('returns null when address is not a string', () => {
    expect(parsePayWithToken({ address: 123, chainId: '0x1' })).toBeNull();
  });

  it('returns null when chainId is not a string', () => {
    expect(parsePayWithToken({ address: '0xabc', chainId: null })).toBeNull();
  });

  it('returns null when description is present but not a string', () => {
    expect(
      parsePayWithToken({
        address: '0xabc',
        chainId: '0x1',
        description: 42,
      }),
    ).toBeNull();
  });

  it('returns object with address and chainId when valid', () => {
    expect(
      parsePayWithToken({
        address: '0xusdc',
        chainId: '0xa4b1',
      }),
    ).toEqual({
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });

  it('includes description when it is a string', () => {
    expect(
      parsePayWithToken({
        description: 'USDC',
        address: '0xusdc',
        chainId: '0xa4b1',
      }),
    ).toEqual({
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    });
  });
});
