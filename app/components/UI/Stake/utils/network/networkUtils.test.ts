import { getNetworkClientIdByChainId } from '.';

const mockNetworkClientId = 'mainnet';

const mockNetworkConfiguration = {
  blockExplorerUrls: [],
  chainId: '0x1',
  defaultRpcEndpointIndex: 0,
  name: 'Ethereum Mainnet',
  nativeCurrency: 'ETH',
  rpcEndpoints: [
    {
      networkClientId: mockNetworkClientId,
    },
  ],
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: () => mockNetworkConfiguration,
    },
  },
}));

describe('Stake Network Utils', () => {
  describe('getNetworkClientIdByChainId', () => {
    it('returns the active networkClientId', () => {
      const result = getNetworkClientIdByChainId(`0x1`);
      expect(result).toBe(mockNetworkClientId);
    });
  });
});
