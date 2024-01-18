import overwriteRPCWith from './handleRpcOverwrite';
import { RPC_METHODS } from '../SDKConnectConstants';

jest.mock('../utils/DevLogger');

describe('handleRpcOverwrite', () => {
  const accountAddress = '0x123';
  const selectedChainId = '1';

  it('should overwrites the params for PERSONAL_SIGN', () => {
    const rpc = {
      method: RPC_METHODS.PERSONAL_SIGN,
      params: ['data', '0xabc'],
    };

    const result = overwriteRPCWith({ rpc, accountAddress, selectedChainId });

    expect(result.params).toEqual(['data', accountAddress]);
  });

  it('should overwrites the params for ETH_SENDTRANSACTION', () => {
    const rpc = {
      method: RPC_METHODS.ETH_SENDTRANSACTION,
      params: [{ from: '0xabc', gas: '0x5208' }],
    };

    const result = overwriteRPCWith({ rpc, accountAddress, selectedChainId });

    expect(result.params).toEqual([{ gas: '0x5208', from: accountAddress }]);
  });

  it('should overwrites the params for ETH_SIGNTYPEDEATA', () => {
    const rpc = {
      method: RPC_METHODS.ETH_SIGNTYPEDEATA,
      params: ['0xabc', { domain: { chainId: '2' }, message: {} }],
    };

    const result = overwriteRPCWith({ rpc, accountAddress, selectedChainId });

    expect(result.params[1].domain.chainId).toBe(selectedChainId);
    expect(result.params[0]).toBe(accountAddress);
  });

  it('should overwrites the params for ETH_SIGNTYPEDEATAV4 and ETH_SIGNTYPEDEATAV3', () => {
    const rpc = {
      method: RPC_METHODS.ETH_SIGNTYPEDEATAV4,
      params: ['0xabc', { domain: { chainId: '2' }, message: {} }],
    };

    const result = overwriteRPCWith({ rpc, accountAddress, selectedChainId });

    expect(JSON.parse(result.params[1]).domain.chainId).toBe(selectedChainId);
    expect(result.params[0]).toBe(accountAddress);
  });

  it('should does not modify rpc for unsupported methods', () => {
    const rpc = {
      method: 'eth_unsupportedMethod',
      params: ['0xabc'],
    };

    const originalRpc = { ...rpc };
    const result = overwriteRPCWith({ rpc, accountAddress, selectedChainId });

    expect(result).toEqual(originalRpc);
  });
});
