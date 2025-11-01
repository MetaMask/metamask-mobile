import { parseCAIP19AssetId } from './parseCaip19AssetId';

describe('parseCAIP19AssetId', () => {
  describe('valid CAIP-19 asset IDs', () => {
    it('should parse Ethereum ERC-20 token correctly', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '1',
        assetNamespace: 'erc20',
        assetReference: '0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13',
      });
    });

    it('should parse Solana token correctly', () => {
      const assetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'solana',
        chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        assetNamespace: 'token',
        assetReference: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      });
    });

    it('should parse Ethereum mainnet USDC token correctly', () => {
      const assetId =
        'eip155:1/erc20:0xA0b86a33E6776e681a06e0e1622c5e5e3e6a8b13';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '1',
        assetNamespace: 'erc20',
        assetReference: '0xA0b86a33E6776e681a06e0e1622c5e5e3e6a8b13',
      });
    });

    it('should parse Polygon ERC-20 token correctly', () => {
      const assetId =
        'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '137',
        assetNamespace: 'erc20',
        assetReference: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      });
    });

    it('should parse Arbitrum ERC-20 token correctly', () => {
      const assetId =
        'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '42161',
        assetNamespace: 'erc20',
        assetReference: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      });
    });

    it('should parse Optimism ERC-20 token correctly', () => {
      const assetId =
        'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '10',
        assetNamespace: 'erc20',
        assetReference: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      });
    });

    it('should parse BSC BEP-20 token correctly', () => {
      const assetId =
        'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '56',
        assetNamespace: 'erc20',
        assetReference: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      });
    });

    it('should parse Avalanche C-Chain ERC-20 token correctly', () => {
      const assetId =
        'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '43114',
        assetNamespace: 'erc20',
        assetReference: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
      });
    });

    it('should parse Solana mainnet token correctly', () => {
      const assetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111112';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'solana',
        chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        assetNamespace: 'token',
        assetReference: 'So11111111111111111111111111111111111111112',
      });
    });

    it('should parse Solana devnet token correctly', () => {
      const assetId =
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/token:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'solana',
        chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
        assetNamespace: 'token',
        assetReference: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      });
    });

    it('should parse Bitcoin SLIP-44 asset correctly', () => {
      const assetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'bip122',
        chainId: '000000000019d6689c085ae165831e93',
        assetNamespace: 'slip44',
        assetReference: '0',
      });
    });

    it('should parse Ethereum native asset (ETH) via SLIP-44 correctly', () => {
      const assetId = 'eip155:1/slip44:60';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '1',
        assetNamespace: 'slip44',
        assetReference: '60',
      });
    });

    it('should parse Bitcoin Cash SLIP-44 asset correctly', () => {
      const assetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'bip122',
        chainId: '000000000000000000651ef99cb9fcbe',
        assetNamespace: 'slip44',
        assetReference: '145',
      });
    });

    it('should parse Litecoin SLIP-44 asset correctly', () => {
      const assetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'bip122',
        chainId: '12a765e31ffd4059bada1e25190f6e98',
        assetNamespace: 'slip44',
        assetReference: '2',
      });
    });

    it('should parse Dogecoin SLIP-44 asset correctly', () => {
      const assetId = 'bip122:1a91e3dace36e2be3bf030a65679fe82/slip44:3';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'bip122',
        chainId: '1a91e3dace36e2be3bf030a65679fe82',
        assetNamespace: 'slip44',
        assetReference: '3',
      });
    });

    it('should parse Polygon native asset (MATIC) via SLIP-44 correctly', () => {
      const assetId = 'eip155:137/slip44:966';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '137',
        assetNamespace: 'slip44',
        assetReference: '966',
      });
    });

    it('should parse BNB Smart Chain native asset (BNB) via SLIP-44 correctly', () => {
      const assetId = 'eip155:56/slip44:714';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '56',
        assetNamespace: 'slip44',
        assetReference: '714',
      });
    });

    it('should parse Avalanche C-Chain native asset (AVAX) via SLIP-44 correctly', () => {
      const assetId = 'eip155:43114/slip44:9000';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '43114',
        assetNamespace: 'slip44',
        assetReference: '9000',
      });
    });

    it('should parse Solana native asset (SOL) via SLIP-44 correctly', () => {
      const assetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'solana',
        chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        assetNamespace: 'slip44',
        assetReference: '501',
      });
    });

    it('should parse Cardano SLIP-44 asset correctly', () => {
      const assetId = 'cardano:1a3be38bcbb7911969283716ad7aa550/slip44:1815';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'cardano',
        chainId: '1a3be38bcbb7911969283716ad7aa550',
        assetNamespace: 'slip44',
        assetReference: '1815',
      });
    });

    it('should parse Ethereum native asset (ETH) via SLIP-44 wildcard correctly', () => {
      const assetId = 'eip155:1/slip44:.';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '1',
        assetNamespace: 'slip44',
        assetReference: '.',
      });
    });
  });

  describe('invalid CAIP-19 asset IDs', () => {
    it('should return null for empty string', () => {
      const result = parseCAIP19AssetId('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format - missing asset namespace', () => {
      const result = parseCAIP19AssetId(
        'eip155:1/0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13',
      );
      expect(result).toBeNull();
    });

    it('should return null for invalid format - missing chain ID', () => {
      const result = parseCAIP19AssetId(
        'eip155/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13',
      );
      expect(result).toBeNull();
    });

    it('should return null for invalid format - missing namespace', () => {
      const result = parseCAIP19AssetId(
        ':1/erc20:0xa0b86a33e6776e681a06e0e1622c5e5e3e6a8b13',
      );
      expect(result).toBeNull();
    });

    it('should return null for invalid format - missing asset reference', () => {
      const result = parseCAIP19AssetId('eip155:1/erc20:');
      expect(result).toBeNull();
    });

    it('should return null for completely malformed string', () => {
      const result = parseCAIP19AssetId('not-a-caip19-id');
      expect(result).toBeNull();
    });

    it('should return null for partial CAIP-19 format', () => {
      const result = parseCAIP19AssetId('eip155:1');
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle case sensitivity in asset addresses', () => {
      const assetId =
        'eip155:1/erc20:0xA0B86A33E6776E681A06E0E1622C5E5E3E6A8B13';
      const result = parseCAIP19AssetId(assetId);

      expect(result).toEqual({
        namespace: 'eip155',
        chainId: '1',
        assetNamespace: 'erc20',
        assetReference: '0xA0B86A33E6776E681A06E0E1622C5E5E3E6A8B13',
      });
    });

    it('should handle long Solana token addresses', () => {
      const assetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const result = parseCAIP19AssetId(assetId);

      expect(result?.assetReference).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );
    });
  });
});
