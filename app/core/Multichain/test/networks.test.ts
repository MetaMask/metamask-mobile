import {
  formatBlockExplorerUrl,
  formatBlockExplorerAddressUrl,
  type MultichainBlockExplorerFormatUrls,
} from '../networks';
import { MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP } from '../constants';
import { BtcScope, SolScope } from '@metamask/keyring-api';

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

    describe('Ethereum networks', () => {
      it('correctly formats Ethereum address URLs', () => {
        const urls: MultichainBlockExplorerFormatUrls = {
          url: 'https://etherscan.io',
          address: 'https://etherscan.io/address/{address}',
          transaction: 'https://etherscan.io/tx/{txId}',
        };
        const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        );
      });

      it('correctly formats Ethereum Goerli testnet address URLs', () => {
        const urls: MultichainBlockExplorerFormatUrls = {
          url: 'https://goerli.etherscan.io',
          address: 'https://goerli.etherscan.io/address/{address}',
          transaction: 'https://goerli.etherscan.io/tx/{txId}',
        };
        const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://goerli.etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        );
      });

      it('correctly formats Ethereum Sepolia testnet address URLs', () => {
        const urls: MultichainBlockExplorerFormatUrls = {
          url: 'https://sepolia.etherscan.io',
          address: 'https://sepolia.etherscan.io/address/{address}',
          transaction: 'https://sepolia.etherscan.io/tx/{txId}',
        };
        const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://sepolia.etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        );
      });
    });

    describe('Bitcoin networks', () => {
      it('correctly formats Bitcoin mainnet address URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Mainnet];
        const address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://mempool.space/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        );
      });

      it('correctly formats Bitcoin testnet address URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Testnet];
        const address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://mempool.space/testnet/address/tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        );
      });
    });

    describe('Solana networks', () => {
      it('correctly formats Solana mainnet address URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Mainnet];
        const address = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://solscan.io/account/HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        );
      });

      it('correctly formats Solana devnet address URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Devnet];
        const address = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://solscan.io/account/HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH?cluster=devnet',
        );
      });

      it('correctly formats Solana testnet address URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Testnet];
        const address = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

        const result = formatBlockExplorerAddressUrl(urls, address);

        expect(result).toBe(
          'https://solscan.io/account/HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH?cluster=testnet',
        );
      });
    });

    describe('Transaction URL formatting', () => {
      it('correctly formats Ethereum mainnet transaction URLs', () => {
        const urls: MultichainBlockExplorerFormatUrls = {
          url: 'https://etherscan.io',
          address: 'https://etherscan.io/address/{address}',
          transaction: 'https://etherscan.io/tx/{txId}',
        };
        const txId =
          '0x5731d8c22eb2a1955fa13522efb599650e91cecff1c3e3e4fd4c027c936dec13';

        const result = formatBlockExplorerUrl(urls.transaction, 'txId', txId);

        expect(result).toBe(
          'https://etherscan.io/tx/0x5731d8c22eb2a1955fa13522efb599650e91cecff1c3e3e4fd4c027c936dec13',
        );
      });

      it('correctly formats Ethereum testnet transaction URLs', () => {
        const urls: MultichainBlockExplorerFormatUrls = {
          url: 'https://sepolia.etherscan.io',
          address: 'https://sepolia.etherscan.io/address/{address}',
          transaction: 'https://sepolia.etherscan.io/tx/{txId}',
        };
        const txId =
          '0x5731d8c22eb2a1955fa13522efb599650e91cecff1c3e3e4fd4c027c936dec13';

        const result = formatBlockExplorerUrl(urls.transaction, 'txId', txId);

        expect(result).toBe(
          'https://sepolia.etherscan.io/tx/0x5731d8c22eb2a1955fa13522efb599650e91cecff1c3e3e4fd4c027c936dec13',
        );
      });

      it('correctly formats Bitcoin mainnet transaction URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Mainnet];
        const txId =
          '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';

        const result = formatBlockExplorerUrl(urls.transaction, 'txId', txId);

        expect(result).toBe(
          'https://mempool.space/tx/4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        );
      });

      it('correctly formats Solana mainnet transaction URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Mainnet];
        const txId =
          '4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4s8PYKUfuQP3wsMqXGEMt6eWoRu4V8YHJKkdKWCYTct6wUMqxHMKkRE';

        const result = formatBlockExplorerUrl(urls.transaction, 'txId', txId);

        expect(result).toBe(
          'https://solscan.io/tx/4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4s8PYKUfuQP3wsMqXGEMt6eWoRu4V8YHJKkdKWCYTct6wUMqxHMKkRE',
        );
      });

      it('correctly formats Solana testnet transaction URLs', () => {
        const urls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Testnet];
        const txId =
          '4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4s8PYKUfuQP3wsMqXGEMt6eWoRu4V8YHJKkdKWCYTct6wUMqxHMKkRE';

        const result = formatBlockExplorerUrl(urls.transaction, 'txId', txId);

        expect(result).toBe(
          'https://solscan.io/tx/4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4s8PYKUfuQP3wsMqXGEMt6eWoRu4V8YHJKkdKWCYTct6wUMqxHMKkRE?cluster=testnet',
        );
      });
    });

    describe('Base URL verification', () => {
      it('verifies Ethereum base URL formats', () => {
        const ethUrls: MultichainBlockExplorerFormatUrls = {
          url: 'https://etherscan.io',
          address: 'https://etherscan.io/address/{address}',
          transaction: 'https://etherscan.io/tx/{txId}',
        };
        expect(ethUrls.url).toBe('https://etherscan.io');
      });

      it('verifies Bitcoin base URL formats', () => {
        const bitcoinUrls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Mainnet];
        expect(bitcoinUrls.url).toBe('https://mempool.space/');
      });

      it('verifies Solana base URL formats', () => {
        const solanaUrls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Mainnet];
        expect(solanaUrls.url).toBe('https://solscan.io/');
      });
    });
  });
});
