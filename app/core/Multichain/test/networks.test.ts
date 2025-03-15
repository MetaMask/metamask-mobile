import {
  formatBlockExplorerUrl,
  formatBlockExplorerAddressUrl,
  type MultichainBlockExplorerFormatUrls,
} from '../networks';

describe('networks', () => {
  describe('formatBlockExplorerUrl', () => {
    it('correctly formats a URL by replacing a tag with a value', () => {
      const formatUrl = 'https://etherscan.io/address/{address}' as const;
      const tag = 'address';
      const value = '0x123456789';

      const result = formatBlockExplorerUrl(formatUrl, tag, value);

      expect(result).toBe('https://etherscan.io/address/0x123456789');
    });

    it('handles multiple occurrences of the same tag', () => {
      const formatUrl = 'https://test.com/{txId}/view/{txId}/details' as const;
      const tag = 'txId';
      const value = 'abc123';

      const result = formatBlockExplorerUrl(formatUrl, tag, value);

      expect(result).toBe('https://test.com/abc123/view/abc123/details');
    });
  });

  describe('formatBlockExplorerAddressUrl', () => {
    it('correctly formats an address URL using the provided URLs object', () => {
      const urls: MultichainBlockExplorerFormatUrls = {
        url: 'https://etherscan.io',
        address: 'https://etherscan.io/address/{address}',
        transaction: 'https://etherscan.io/tx/{txId}',
      };
      const address = '0x123456789abcdef';

      const result = formatBlockExplorerAddressUrl(urls, address);

      expect(result).toBe('https://etherscan.io/address/0x123456789abcdef');
    });

    it('works with different block explorer URL formats', () => {
      const urls: MultichainBlockExplorerFormatUrls = {
        url: 'https://bscscan.com',
        address: 'https://bscscan.com/token/{address}',
        transaction: 'https://bscscan.com/tx/{txId}',
      };
      const address = '0xtoken123';

      const result = formatBlockExplorerAddressUrl(urls, address);

      expect(result).toBe('https://bscscan.com/token/0xtoken123');
    });
  });
});
