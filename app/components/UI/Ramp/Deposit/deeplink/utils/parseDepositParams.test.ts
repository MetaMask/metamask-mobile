import parseDepositParams from './parseDepositParams';

describe('parseDepositParams', () => {
  it('returns undefined if depositParams do not contain necessary fields', () => {
    const depositParams = {};
    const result = parseDepositParams(depositParams);
    expect(result).toBeUndefined();
  });

  it('returns a RampIntent object if depositParams contain necessary fields', () => {
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

  it('returns a DepositNavigationParams object with only defined fields', () => {
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

  it('returns a DepositNavigationParams object with only defined values', () => {
    const depositParams = {
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      amount: undefined,
    };
    const result = parseDepositParams(depositParams);
    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    });
  });
});
