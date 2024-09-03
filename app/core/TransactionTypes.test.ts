import TransactionTypes from './TransactionTypes.ts';

describe('TransactionTypes', () => {
  it('should have the correct CUSTOM_GAS values', () => {
    expect(TransactionTypes.CUSTOM_GAS).toEqual({
      AVERAGE_GAS: 20,
      LOW_GAS: 10,
      FAST_GAS: 40,
      DEFAULT_GAS_LIMIT: '0x5208',
    });
  });

  it('should have the correct ASSET values', () => {
    expect(TransactionTypes.ASSET).toEqual({
      ETH: 'ETH',
      ERC20: 'ERC20',
      ERC721: 'ERC721',
      ERC1155: 'ERC1155',
    });
  });

  it('should have the correct MMM value', () => {
    expect(TransactionTypes.MMM).toBe('MetaMask Mobile');
  });

  it('should have the correct MM value', () => {
    expect(TransactionTypes.MM).toBe('metamask');
  });
});
