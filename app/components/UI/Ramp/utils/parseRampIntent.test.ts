import parseRampIntent from './parseRampIntent';

describe('parseRampIntent', () => {
  it('returns undefined if pathParams do not contain necessary fields', () => {
    const pathParams = {};
    const result = parseRampIntent(pathParams);
    expect(result).toBeUndefined();
  });

  it('return a RampIntent object if pathParams contain necessary fields', () => {
    const pathParams = {
      address: '0x1234567890',
      chainId: '1',
      amount: '10',
      currency: 'usd',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      address: '0x1234567890',
      chainId: '1',
      amount: '10',
      currency: 'usd',
    });
  });

  it('defaults to chainId 1 if token address is defined but chainId is not', () => {
    const pathParams = {
      address: '0x1234567890',
      chainId: undefined,
      amount: '10',
      currency: 'usd',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      address: '0x1234567890',
      chainId: '1',
      amount: '10',
      currency: 'usd',
    });
  });

  it('returns a RampIntent object with only defined fields', () => {
    const pathParams = {
      address: '0x1234567890',
      chainId: '76',
      amount: '10',
      currency: 'usd',
      extraneaous: 'field',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      address: '0x1234567890',
      chainId: '76',
      amount: '10',
      currency: 'usd',
    });
  });

  it('returns a RampIntent object with only defined values', () => {
    const pathParams = { chainId: '56', amount: undefined, address: undefined };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({ chainId: '56' });
  });
});
