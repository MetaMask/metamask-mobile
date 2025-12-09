import { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope, BtcScope, TrxScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import {
  sortNetworkAddressItems,
  getCompatibleNetworksForAccount,
  NetworkAddressItem,
} from './MultichainAddressRowsList.utils';

const createMockAccount = (
  address: string,
  scopes: string[],
): InternalAccount => ({
  id: `account-${address}`,
  address,
  metadata: {
    name: `Account ${address}`,
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa',
  scopes: scopes as `${string}:${string}`[],
});

const createMockNetworks = () => ({
  'eip155:0x1': {
    name: 'Ethereum Mainnet',
    chainId: 'eip155:0x1' as CaipChainId,
  },
  'eip155:0x89': {
    name: 'Polygon Mainnet',
    chainId: 'eip155:0x89' as CaipChainId,
  },
  'eip155:0xa': { name: 'Optimism', chainId: 'eip155:0xa' as CaipChainId },
  'eip155:0xaa36a7': {
    name: 'Sepolia',
    chainId: 'eip155:0xaa36a7' as CaipChainId,
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    name: 'Solana',
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
  },
});

describe('MultichainAddressRowsList Utils', () => {
  describe('sortNetworkAddressItems', () => {
    it('sorts networks with Ethereum first', () => {
      const items: NetworkAddressItem[] = [
        { chainId: 'eip155:0x89', networkName: 'Polygon', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
        { chainId: 'eip155:0xa', networkName: 'Optimism', address: '0x123' },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
    });

    it('sorts networks with Bitcoin second and Solana third after Ethereum', () => {
      const items: NetworkAddressItem[] = [
        { chainId: 'eip155:0x89', networkName: 'Polygon', address: '0x123' },
        { chainId: SolScope.Mainnet, networkName: 'Solana', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
        { chainId: BtcScope.Mainnet, networkName: 'Bitcoin', address: '0x123' },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
      expect(sorted[1].chainId).toBe(BtcScope.Mainnet);
      expect(sorted[2].chainId).toBe(SolScope.Mainnet);
    });

    it('sorts networks with Tron fourth after Ethereum, Bitcoin, and Solana', () => {
      const items: NetworkAddressItem[] = [
        { chainId: TrxScope.Mainnet, networkName: 'Tron', address: '0x123' },
        { chainId: 'eip155:0x89', networkName: 'Polygon', address: '0x123' },
        { chainId: SolScope.Mainnet, networkName: 'Solana', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
        { chainId: BtcScope.Mainnet, networkName: 'Bitcoin', address: '0x123' },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
      expect(sorted[1].chainId).toBe(BtcScope.Mainnet);
      expect(sorted[2].chainId).toBe(SolScope.Mainnet);
      expect(sorted[3].chainId).toBe(TrxScope.Mainnet);
    });

    it('sorts networks with Linea fifth after Ethereum, Bitcoin, Solana, and Tron', () => {
      const items: NetworkAddressItem[] = [
        {
          chainId: `eip155:${CHAIN_IDS.LINEA_MAINNET}`,
          networkName: 'Linea',
          address: '0x123',
        },
        { chainId: TrxScope.Mainnet, networkName: 'Tron', address: '0x123' },
        { chainId: 'eip155:0x89', networkName: 'Polygon', address: '0x123' },
        { chainId: SolScope.Mainnet, networkName: 'Solana', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
        { chainId: BtcScope.Mainnet, networkName: 'Bitcoin', address: '0x123' },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
      expect(sorted[1].chainId).toBe(BtcScope.Mainnet);
      expect(sorted[2].chainId).toBe(SolScope.Mainnet);
      expect(sorted[3].chainId).toBe(TrxScope.Mainnet);
      expect(sorted[4].chainId).toBe(`eip155:${CHAIN_IDS.LINEA_MAINNET}`);
    });

    it('sorts test networks last', () => {
      const items: NetworkAddressItem[] = [
        {
          chainId: 'eip155:0xaa36a7',
          networkName: 'Sepolia',
          address: '0x123',
        },
        { chainId: 'eip155:0x89', networkName: 'Polygon', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
      expect(sorted[sorted.length - 1].chainId).toBe('eip155:0xaa36a7');
    });

    it('sorts networks alphabetically within same priority', () => {
      const items: NetworkAddressItem[] = [
        { chainId: 'eip155:0x2', networkName: 'Z Network', address: '0x123' },
        { chainId: 'eip155:0x3', networkName: 'A Network', address: '0x123' },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].networkName).toBe('A Network');
      expect(sorted[1].networkName).toBe('Z Network');
    });
  });

  describe('getCompatibleNetworksForAccount', () => {
    const mockNetworks = createMockNetworks();

    it('returns empty array when account has no scopes', () => {
      const account = createMockAccount('0x123', []);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);
      expect(result).toEqual([]);
    });

    it('returns specific network for specific scope', () => {
      const account = createMockAccount('0x123', ['eip155:0x1']);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        chainId: 'eip155:0x1',
        networkName: 'Ethereum Mainnet',
        address: '0x123',
      });
    });

    it('handles wildcard scopes correctly', () => {
      const account = createMockAccount('0x456', ['eip155:*']);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      const evmNetworks = result.filter((item) =>
        item.chainId.startsWith('eip155:'),
      );
      expect(evmNetworks.length).toBeGreaterThan(1);
      expect(evmNetworks.some((item) => item.chainId === 'eip155:0x1')).toBe(
        true,
      );
      expect(evmNetworks.some((item) => item.chainId === 'eip155:0x89')).toBe(
        true,
      );
    });

    it('handles Solana wildcard scope', () => {
      const account = createMockAccount('sol123', ['solana:*']);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      const solanaNetworks = result.filter((item) =>
        item.chainId.startsWith('solana:'),
      );
      expect(solanaNetworks.length).toBeGreaterThan(0);
      expect(solanaNetworks[0].chainId).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });

    it('handles multiple specific scopes', () => {
      const account = createMockAccount('0x789', [
        'eip155:0x1',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result).toHaveLength(2);
      expect(result.some((item) => item.chainId === 'eip155:0x1')).toBe(true);
      expect(
        result.some(
          (item) => item.chainId === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ),
      ).toBe(true);
    });

    it('ignores scopes for networks that do not exist', () => {
      const account = createMockAccount('0x999', [
        'eip155:0x999',
        'eip155:0x1',
      ]);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe('eip155:0x1');
    });

    it('includes correct address for each network', () => {
      const testAddress = '0xabcdef';
      const account = createMockAccount(testAddress, ['eip155:0x1']);
      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result[0].address).toBe(testAddress);
    });

    it('converts lowercase EVM address to checksummed format', () => {
      const lowercaseEvmAddress = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
      const expectedChecksummed = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
      const account = createMockAccount(lowercaseEvmAddress, ['eip155:0x1']);

      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result[0].address).toBe(expectedChecksummed);
    });

    it('returns unmodified address for non-EVM networks', () => {
      const solanaAddress = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';
      const account = createMockAccount(solanaAddress, [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);

      const result = getCompatibleNetworksForAccount(account, mockNetworks);

      expect(result[0].address).toBe(solanaAddress);
    });
  });
});
