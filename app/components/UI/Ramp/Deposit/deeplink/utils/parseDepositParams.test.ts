import parseDepositParams from './parseDepositParams';

describe('parseDepositParams', () => {
  it('returns undefined when depositParams do not contain necessary fields', () => {
    const depositParams = {};

    const result = parseDepositParams(depositParams);

    expect(result).toBeUndefined();
  });

  it('returns DepositNavigationParams with assetId and amount', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
    });
  });

  it('returns DepositNavigationParams without extraneous fields', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
      extraneaous: 'field',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
    });
  });

  it('returns DepositNavigationParams excluding undefined values', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: undefined,
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    });
  });

  it('converts chainId and address to CAIP-19 assetId for ERC20 tokens', () => {
    const depositParams = {
      chainId: '1',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '100',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:0x1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '100',
    });
  });

  it('converts chainId and native address to CAIP-19 assetId with slip44', () => {
    const depositParams = {
      chainId: '1',
      address: '0x0000000000000000000000000000000000000000',
      amount: '50',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:0x1/slip44:.',
      amount: '50',
    });
  });

  it('defaults to Ethereum mainnet when chainId is not provided', () => {
    const depositParams = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '75',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:0x1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '75',
    });
  });

  it('includes currency when provided', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
      currency: 'USD',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '10',
      currency: 'USD',
    });
  });

  it('prioritizes assetId over chainId and address', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      chainId: '137',
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      amount: '25',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: '25',
    });
  });

  it('handles invalid address by removing all asset-related fields', () => {
    const depositParams = {
      chainId: '1',
      address: 'invalid-address',
      amount: '100',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      amount: '100',
    });
  });

  it('returns intent with only amount when only amount is provided', () => {
    const depositParams = {
      amount: '200',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      amount: '200',
    });
  });

  it('returns intent with only currency when only currency is provided', () => {
    const depositParams = {
      currency: 'EUR',
    };

    const result = parseDepositParams(depositParams);

    expect(result).toEqual({
      currency: 'EUR',
    });
  });
});
