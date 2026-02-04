import parseRampIntent from './parseRampIntent';

describe('parseRampIntent', () => {
  it('returns undefined if pathParams do not contain necessary fields', () => {
    const pathParams = {};
    const result = parseRampIntent(pathParams);
    expect(result).toBeUndefined();
  });

  it('Returns a RampIntent object if pathParams contain necessary fields', () => {
    const pathParams = {
      assetId: 'eip155:1/erc20:0x1234567890',
      amount: '10',
      currency: 'usd',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0x1234567890',
      amount: '10',
      currency: 'usd',
    });
  });

  it('Returns a RampIntent object with only defined fields', () => {
    const pathParams = {
      assetId: 'eip155:1/erc20:0x1234567890',
      amount: '10',
      currency: undefined,
      extraneaous: 'field',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0x1234567890',
      amount: '10',
    });
  });

  it('Returns a RampIntent object with defined fields', () => {
    const pathParams = {
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
    };
    const result = parseRampIntent(pathParams);
    expect(result).toEqual({
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
    });
  });

  describe('Backwards compatible test cases', () => {
    it('returns a RampIntent object if pathParams contain legacy necessary fields', () => {
      const pathParams = {
        address: '0x1234567890',
        chainId: '1',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/erc20:0x1234567890',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object if pathParams contain legacy necessary fields with native address', () => {
      const pathParams = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '1',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/slip44:60',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object if pathParams contain legacy necessary fields with random value', () => {
      const pathParams = {
        address: 'string_random',
        chainId: '1',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/string_random',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object if pathParams contain legacy necessary fields without address value', () => {
      const pathParams = {
        address: '',
        chainId: '56',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:56/slip44:714',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object if pathParams contain legacy necessary fields without address value', () => {
      const pathParams = {
        chainId: '56',
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:56/slip44:714',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object if pathParams contain legacy necessary fields without chainId value', () => {
      const pathParams = {
        address: '0x1234567890',
        amount: '10',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/erc20:0x1234567890',
        amount: '10',
      });
    });
  });

  describe('Legacy existing test cases updated to assetId', () => {
    it('defaults to chainId 1 if token address is defined but chainId is not', () => {
      const pathParams = {
        address: '0x1234567890',
        chainId: undefined,
        amount: '10',
        currency: 'usd',
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:1/erc20:0x1234567890',
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
        assetId: 'eip155:76/erc20:0x1234567890',
        amount: '10',
        currency: 'usd',
      });
    });

    it('returns a RampIntent object with only defined values', () => {
      const pathParams = {
        chainId: '56',
        amount: undefined,
        address: undefined,
      };
      const result = parseRampIntent(pathParams);
      expect(result).toEqual({
        assetId: 'eip155:56/slip44:714',
      });
    });
  });
});
