import {
  formatNetworkRpcUrl,
  templateInfuraRpc,
  getDefaultBlockExplorerUrl,
} from './NetworkDetailsView.utils';

jest.mock('../../../../util/stripProtocol', () => (url: string | undefined) => {
  if (!url) return undefined;
  return url.replace(/^https?:\/\//, '');
});

jest.mock(
  '../../../../util/stripKeyFromInfuraUrl',
  () => (url: string | undefined) => {
    if (!url) return undefined;
    return url.replace(/\/v3\/[a-f0-9]+$/, '');
  },
);

jest.mock('./NetworkDetailsView.constants', () => ({
  infuraProjectId: 'test-infura-key',
}));

jest.mock('../../../../util/networks/customNetworks', () => ({
  PopularList: [
    {
      chainId: '0x89',
      nickname: 'Polygon',
      rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
    },
    {
      chainId: '0xa86a',
      nickname: 'Avalanche',
      rpcPrefs: { blockExplorerUrl: 'https://snowtrace.io' },
    },
  ],
}));

describe('NetworkDetailsView.utils', () => {
  describe('formatNetworkRpcUrl', () => {
    it('strips protocol from a plain URL', () => {
      expect(formatNetworkRpcUrl('https://mainnet.infura.io')).toBe(
        'mainnet.infura.io',
      );
    });

    it('strips Infura key and protocol', () => {
      expect(
        formatNetworkRpcUrl('https://mainnet.infura.io/v3/abc123def'),
      ).toBe('mainnet.infura.io');
    });

    it('handles http protocol', () => {
      expect(formatNetworkRpcUrl('http://localhost:8545')).toBe(
        'localhost:8545',
      );
    });
  });

  describe('templateInfuraRpc', () => {
    it('replaces {infuraProjectId} placeholder at the end', () => {
      const result = templateInfuraRpc(
        'https://mainnet.infura.io/v3/{infuraProjectId}',
      );
      expect(result).toBe('https://mainnet.infura.io/v3/test-infura-key');
    });

    it('does not modify URLs without the placeholder', () => {
      const url = 'https://polygon-rpc.com';
      expect(templateInfuraRpc(url)).toBe(url);
    });

    it('does not modify URLs with placeholder in the middle', () => {
      const url = 'https://{infuraProjectId}.example.com/v3';
      expect(templateInfuraRpc(url)).toBe(url);
    });
  });

  describe('getDefaultBlockExplorerUrl', () => {
    it('returns block explorer from PopularList when chainId matches', () => {
      expect(getDefaultBlockExplorerUrl('0x89')).toBe(
        'https://polygonscan.com',
      );
    });

    it('returns block explorer for another popular network', () => {
      expect(getDefaultBlockExplorerUrl('0xa86a')).toBe('https://snowtrace.io');
    });

    it('returns undefined for unknown chainId without networkType', () => {
      expect(getDefaultBlockExplorerUrl('0xdeadbeef')).toBeUndefined();
    });

    it('returns undefined for unknown chainId with unknown networkType', () => {
      expect(
        getDefaultBlockExplorerUrl('0xdeadbeef', 'unknown-type'),
      ).toBeUndefined();
    });
  });
});
