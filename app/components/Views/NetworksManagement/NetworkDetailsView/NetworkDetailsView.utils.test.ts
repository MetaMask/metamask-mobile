import { RpcEndpointType } from '@metamask/network-controller';
import {
  appendBlockExplorerItemToFormState,
  appendRpcItemToFormState,
  applyBlockExplorerSelectionToFormState,
  applyRpcSelectionToFormState,
  formatNetworkRpcUrl,
  getDefaultBlockExplorerUrl,
  networkFormBaselineSnapshot,
  removeBlockExplorerUrlFromFormState,
  removeRpcUrlFromFormState,
  templateInfuraRpc,
} from './NetworkDetailsView.utils';
import type { NetworkFormState } from './NetworkDetailsView.types';

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

  describe('appendRpcItemToFormState', () => {
    const editFormFixture = (): NetworkFormState =>
      ({
        rpcUrl: 'https://existing.com',
        failoverRpcUrls: ['https://failover.com'],
        rpcName: 'Old',
        rpcUrlForm: 'typed',
        rpcNameForm: 'typedName',
        rpcUrls: [
          {
            url: 'https://existing.com',
            name: 'Old',
            type: RpcEndpointType.Custom,
          },
        ],
        blockExplorerUrls: [],
        selectedRpcEndpointIndex: 0,
        blockExplorerUrl: undefined,
        blockExplorerUrlForm: undefined,
        nickname: 'Net',
        chainId: '0x1',
        ticker: 'ETH',
        editable: true,
        addMode: false,
      }) as NetworkFormState;

    it('appends endpoint, selects it, clears sheet fields and failover', () => {
      const prev = editFormFixture();
      const next = appendRpcItemToFormState(prev, 'https://new.com', 'New');

      expect(next.rpcUrls).toHaveLength(2);
      expect(next.rpcUrls[1]).toEqual({
        url: 'https://new.com',
        name: 'New',
        type: RpcEndpointType.Custom,
      });
      expect(next.rpcUrl).toBe('https://new.com');
      expect(next.rpcName).toBe('New');
      expect(next.failoverRpcUrls).toBeUndefined();
      expect(next.rpcUrlForm).toBe('');
      expect(next.rpcNameForm).toBe('');
    });

    it('returns prev when url is empty', () => {
      const prev = editFormFixture();
      expect(appendRpcItemToFormState(prev, '', 'x')).toBe(prev);
    });
  });

  describe('applyRpcSelectionToFormState', () => {
    it('uses type when name is empty', () => {
      const prev = {
        rpcUrl: 'https://a.com',
        rpcUrls: [
          { url: 'https://a.com', name: 'A', type: RpcEndpointType.Custom },
        ],
        rpcName: 'A',
        failoverRpcUrls: undefined,
      } as NetworkFormState;
      const next = applyRpcSelectionToFormState(
        prev,
        'https://b.com',
        ['https://f.com'],
        '',
        'Custom',
      );
      expect(next.rpcUrl).toBe('https://b.com');
      expect(next.rpcName).toBe('Custom');
      expect(next.failoverRpcUrls).toEqual(['https://f.com']);
    });
  });

  describe('removeRpcUrlFromFormState', () => {
    it('repoints selection to first endpoint when current is removed', () => {
      const prev = {
        rpcUrl: 'https://b.com',
        rpcName: 'B',
        rpcUrls: [
          { url: 'https://a.com', name: 'A', type: RpcEndpointType.Custom },
          { url: 'https://b.com', name: 'B', type: RpcEndpointType.Custom },
        ],
      } as NetworkFormState;
      const next = removeRpcUrlFromFormState(prev, 'https://b.com');
      expect(next.rpcUrls).toHaveLength(1);
      expect(next.rpcUrl).toBe('https://a.com');
      expect(next.rpcName).toBe('A');
    });

    it('clears rpcUrl and rpcName when deleting the last endpoint while it was selected', () => {
      const prev = {
        rpcUrl: 'https://only.com',
        rpcName: 'Only',
        failoverRpcUrls: ['https://fail.com'],
        rpcUrls: [
          {
            url: 'https://only.com',
            name: 'Only',
            type: RpcEndpointType.Custom,
          },
        ],
      } as NetworkFormState;
      const next = removeRpcUrlFromFormState(prev, 'https://only.com');
      expect(next.rpcUrls).toEqual([]);
      expect(next.rpcUrl).toBeUndefined();
      expect(next.rpcName).toBeUndefined();
      expect(next.failoverRpcUrls).toBeUndefined();
    });
  });

  describe('appendBlockExplorerItemToFormState', () => {
    it('appends url and sets selection', () => {
      const prev = {
        blockExplorerUrls: [],
        blockExplorerUrl: undefined,
      } as unknown as NetworkFormState;
      const next = appendBlockExplorerItemToFormState(prev, 'https://scan.com');
      expect(next.blockExplorerUrls).toEqual(['https://scan.com']);
      expect(next.blockExplorerUrl).toBe('https://scan.com');
    });
  });

  describe('applyBlockExplorerSelectionToFormState', () => {
    it('sets blockExplorerUrl', () => {
      const prev = {
        blockExplorerUrls: ['https://a.com'],
        blockExplorerUrl: 'https://a.com',
      } as NetworkFormState;
      expect(
        applyBlockExplorerSelectionToFormState(prev, 'https://b.com')
          .blockExplorerUrl,
      ).toBe('https://b.com');
    });
  });

  describe('removeBlockExplorerUrlFromFormState', () => {
    it('removes matching url', () => {
      const prev = {
        blockExplorerUrls: ['https://a.com', 'https://b.com'],
      } as NetworkFormState;
      expect(
        removeBlockExplorerUrlFromFormState(prev, 'https://a.com')
          .blockExplorerUrls,
      ).toEqual(['https://b.com']);
    });

    it('repoints blockExplorerUrl when deleted url was selected', () => {
      const prev = {
        blockExplorerUrls: ['https://a.com', 'https://b.com'],
        blockExplorerUrl: 'https://a.com',
      } as NetworkFormState;
      const next = removeBlockExplorerUrlFromFormState(prev, 'https://a.com');
      expect(next.blockExplorerUrls).toEqual(['https://b.com']);
      expect(next.blockExplorerUrl).toBe('https://b.com');
    });

    it('clears blockExplorerUrl when deleting the last explorer', () => {
      const prev = {
        blockExplorerUrls: ['https://a.com'],
        blockExplorerUrl: 'https://a.com',
      } as NetworkFormState;
      const next = removeBlockExplorerUrlFromFormState(prev, 'https://a.com');
      expect(next.blockExplorerUrls).toEqual([]);
      expect(next.blockExplorerUrl).toBeUndefined();
    });
  });

  describe('networkFormBaselineSnapshot', () => {
    const minimalForm = (
      overrides: Partial<NetworkFormState> = {},
    ): NetworkFormState =>
      ({
        rpcUrl: 'https://rpc.example.com',
        failoverRpcUrls: undefined,
        rpcName: 'R',
        rpcUrlForm: '',
        rpcNameForm: '',
        rpcUrls: [
          {
            url: 'https://rpc.example.com',
            name: 'SameName',
            type: RpcEndpointType.Custom,
          },
        ],
        blockExplorerUrls: ['https://a.io'],
        selectedRpcEndpointIndex: 0,
        blockExplorerUrl: 'https://a.io',
        blockExplorerUrlForm: undefined,
        nickname: 'Net',
        chainId: '0x1',
        ticker: 'ETH',
        editable: true,
        addMode: false,
        ...overrides,
      }) as NetworkFormState;

    it('differs when only an RPC endpoint display name changes', () => {
      const a = minimalForm();
      const b = minimalForm({
        rpcUrls: [
          {
            url: 'https://rpc.example.com',
            name: 'Renamed',
            type: RpcEndpointType.Custom,
          },
        ],
      });

      expect(networkFormBaselineSnapshot(a)).not.toBe(
        networkFormBaselineSnapshot(b),
      );
    });

    it('differs when a block explorer URL entry changes', () => {
      const a = minimalForm({
        blockExplorerUrls: ['https://a.io'],
        blockExplorerUrl: 'https://a.io',
      });
      const b = minimalForm({
        blockExplorerUrls: ['https://b.io'],
        blockExplorerUrl: 'https://a.io',
      });

      expect(networkFormBaselineSnapshot(a)).not.toBe(
        networkFormBaselineSnapshot(b),
      );
    });

    it('differs when nickname and ticker shift across former string boundary', () => {
      const a = minimalForm({ nickname: 'Net', ticker: 'ABC' });
      const b = minimalForm({ nickname: 'NetA', ticker: 'BC' });

      expect(networkFormBaselineSnapshot(a)).not.toBe(
        networkFormBaselineSnapshot(b),
      );
    });
  });
});
