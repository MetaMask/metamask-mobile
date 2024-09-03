import RPCMethods from './index';

describe('RPCMethods', () => {
  it('should have all expected methods', () => {
    expect(RPCMethods).toHaveProperty('eth_sendTransaction');
    expect(RPCMethods).toHaveProperty('wallet_addEthereumChain');
    expect(RPCMethods).toHaveProperty('wallet_switchEthereumChain');
    expect(RPCMethods).toHaveProperty('wallet_watchAsset');
  });

  // Note: These are basic existence tests. More detailed tests for each method
  // should be implemented in their respective test files.

  it('eth_sendTransaction should be a function', () => {
    expect(typeof RPCMethods.eth_sendTransaction).toBe('function');
  });

  it('wallet_addEthereumChain should be a function', () => {
    expect(typeof RPCMethods.wallet_addEthereumChain).toBe('function');
  });

  it('wallet_switchEthereumChain should be a function', () => {
    expect(typeof RPCMethods.wallet_switchEthereumChain).toBe('function');
  });

  it('wallet_watchAsset should be a function', () => {
    expect(typeof RPCMethods.wallet_watchAsset).toBe('function');
  });
});
