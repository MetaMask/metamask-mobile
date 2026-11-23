import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope, BtcScope, TrxScope, XlmScope } from '@metamask/keyring-api';
import {
  sortNetworkAddressItems,
  NetworkAddressItem,
} from './MultichainAddressRowsList.utils';

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

    it('sorts networks with Stellar fifth after Ethereum, Bitcoin, Solana, and Tron', () => {
      const items: NetworkAddressItem[] = [
        { chainId: XlmScope.Pubnet, networkName: 'Stellar', address: '0x123' },
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
      expect(sorted[4].chainId).toBe(XlmScope.Pubnet);
    });

    it('sorts networks with Linea sixth after Ethereum, Bitcoin, Solana, Tron, and Stellar', () => {
      const items: NetworkAddressItem[] = [
        {
          chainId: `eip155:${CHAIN_IDS.LINEA_MAINNET}`,
          networkName: 'Linea',
          address: '0x123',
        },
        { chainId: XlmScope.Pubnet, networkName: 'Stellar', address: '0x123' },
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
      expect(sorted[4].chainId).toBe(XlmScope.Pubnet);
      expect(sorted[5].chainId).toBe(`eip155:${CHAIN_IDS.LINEA_MAINNET}`);
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

    it('sorts decimal eip155 Polygon with same priority tier as hex eip155:0x89', () => {
      const items: NetworkAddressItem[] = [
        { chainId: 'eip155:137', networkName: 'Polygon A', address: '0x123' },
        { chainId: 'eip155:0x89', networkName: 'Polygon B', address: '0x123' },
        {
          chainId: `eip155:${CHAIN_IDS.MAINNET}`,
          networkName: 'Ethereum',
          address: '0x123',
        },
      ];

      const sorted = sortNetworkAddressItems(items);
      expect(sorted[0].chainId).toBe(`eip155:${CHAIN_IDS.MAINNET}`);
      expect(sorted[1].networkName).toBe('Polygon A');
      expect(sorted[2].networkName).toBe('Polygon B');
    });
  });
});
