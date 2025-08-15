import { getHyperliquidExplorerUrl } from './blockchainUtils';

describe('blockchainUtils', () => {
  describe('getHyperliquidExplorerUrl', () => {
    const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

    it('should generate correct mainnet explorer URL', () => {
      const result = getHyperliquidExplorerUrl('mainnet', testAddress);
      expect(result).toBe(
        `https://app.hyperliquid.xyz/explorer/address/${testAddress}`,
      );
    });

    it('should generate correct testnet explorer URL', () => {
      const result = getHyperliquidExplorerUrl('testnet', testAddress);
      expect(result).toBe(
        `https://app.hyperliquid-testnet.xyz/explorer/address/${testAddress}`,
      );
    });

    it('should handle empty address', () => {
      const result = getHyperliquidExplorerUrl('mainnet', '');
      expect(result).toBe('https://app.hyperliquid.xyz/explorer/address/');
    });
  });
});
