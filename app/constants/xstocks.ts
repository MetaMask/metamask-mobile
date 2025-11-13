import { SolScope } from '@metamask/keyring-api';

export interface XStock {
  symbol: string;
  name: string;
  solanaAddress: string;
}

// Solana Mainnet chain ID for building icon URLs
const SOLANA_CHAIN_ID_FOR_ICONS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

/**
 * Builds the token icon URL using MetaMask's static API
 * Format: https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/{chainId}/token/{address}.png
 */
const buildSolanaTokenIconUrl = (address: string): string =>
  `https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/${SOLANA_CHAIN_ID_FOR_ICONS}/token/${address}.png`;

export const XSTOCKS_DATA: XStock[] = [
  {
    symbol: 'ABTx',
    name: 'Abbott xStock',
    solanaAddress: 'XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7',
  },
  {
    symbol: 'ABBVx',
    name: 'AbbVie xStock',
    solanaAddress: 'XswbinNKyPmzTa5CskMbCPvMW6G5CMnZXZEeQSSQoie',
  },
  {
    symbol: 'ACNx',
    name: 'Accenture xStock',
    solanaAddress: 'Xs5UJzmCRQ8DWZjskExdSQDnbE6iLkRu2jjrRAB1JSU',
  },
  {
    symbol: 'GOOGLx',
    name: 'Alphabet xStock',
    solanaAddress: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
  },
  {
    symbol: 'AMZNx',
    name: 'Amazon xStock',
    solanaAddress: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
  },
  {
    symbol: 'AMBRx',
    name: 'Amber xStock',
    solanaAddress: 'XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb',
  },
  {
    symbol: 'AAPLx',
    name: 'Apple xStock',
    solanaAddress: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
  },
  {
    symbol: 'APPx',
    name: 'AppLovin xStock',
    solanaAddress: 'XsPdAVBi8Zc1xvv53k4JcMrQaEDTgkGqKYeh7AYgPHV',
  },
  {
    symbol: 'AZNx',
    name: 'AstraZeneca xStock',
    solanaAddress: 'Xs3ZFkPYT2BN7qBMqf1j1bfTeTm1rFzEFSsQ1z3wAKU',
  },
  {
    symbol: 'BACx',
    name: 'Bank of America xStock',
    solanaAddress: 'XsvhW8Y3QKfT6yZ2VY7Jmne4w8JGjPkxQA2bRoaW7DU',
  },
  {
    symbol: 'BRKBx',
    name: 'Berkshire Hathaway xStock',
    solanaAddress: 'Xs4F5CL8Yy1BmH5W8Qmx1o3dxxkM8oFVVCb5TvY4HSo',
  },
  {
    symbol: 'BMYx',
    name: 'Bristol Myers Squibb xStock',
    solanaAddress: 'XsqfHi3CbSS8vLt2ubbQtk8F36z1KujJaZuYomTMRvW',
  },
  {
    symbol: 'CVXx',
    name: 'Chevron xStock',
    solanaAddress: 'XsJh4n8TFN1RDCTzxe9xWUzPrQq5iC3iJ7VZ7k3Ga87',
  },
  {
    symbol: 'COSTx',
    name: 'Costco xStock',
    solanaAddress: 'Xs5trmB9EBjEMZUk8Yx7tWMPzcn3W2xLWjXZfD1vhkr',
  },
  {
    symbol: 'DHRx',
    name: 'Danaher xStock',
    solanaAddress: 'XsEzuLcPJt8KHpZfM5FZpP4QCZkBVvXtGHbP1kq8XHq',
  },
  {
    symbol: 'XOMx',
    name: 'Exxon Mobil xStock',
    solanaAddress: 'XsLQ3dKXzDSEKDr2HUPZz8qjp7qG2VXk4EKqMQCkHjE',
  },
  {
    symbol: 'HONx',
    name: 'Honeywell xStock',
    solanaAddress: 'Xsb1pXD8P4mU3fU9KbG6HzRYVrGMkb2JzKYkDpnZH3q',
  },
  {
    symbol: 'JNJx',
    name: 'Johnson & Johnson xStock',
    solanaAddress: 'Xs4HqD8r7JVj1kXxEjFzRGb7vqXjJ5qVVmXvpY8CGTB',
  },
  {
    symbol: 'JPMx',
    name: 'JPMorgan Chase xStock',
    solanaAddress: 'XsA8M7TH8rWhpKUhXvL6h5gKTzqJ1qLRZaZFXpMbPfR',
  },
  {
    symbol: 'LLYx',
    name: 'Eli Lilly xStock',
    solanaAddress: 'XsJQDmFPu4vmqKBUZWqXoH9vWRB3fJGmZhHBP8kZrZj',
  },
  {
    symbol: 'MCDx',
    name: "McDonald's xStock",
    solanaAddress: 'XsNpA4MzPmbxkXqZGjSb5Yz9pQJMQhYJgCdWQvKkXQg',
  },
  {
    symbol: 'METAx',
    name: 'Meta xStock',
    solanaAddress: 'Xs6JGq1mxAn9V7kNmtxGJWYv8RWNuU4qbHQAh6gRqBg',
  },
  {
    symbol: 'MSFTx',
    name: 'Microsoft xStock',
    solanaAddress: 'XsJQDnGX7v5cDqNWqpM1pzQjqjqJ1J8YJmBVqBXjqBg',
  },
  {
    symbol: 'MRKx',
    name: 'Merck xStock',
    solanaAddress: 'XsYRvqzj8kU7yJWjQXkBaHGmXvZKKpjxwqHGJZVXZKQ',
  },
  {
    symbol: 'NVDAx',
    name: 'NVIDIA xStock',
    solanaAddress: 'XsJdZbW6HmxMx7r7vKQZkQvJqvkK8YJmBYqvVqBXZZj',
  },
  {
    symbol: 'PGx',
    name: 'Procter & Gamble xStock',
    solanaAddress: 'XsqFkXP7Uh8TmKkQjJBhZX8YxHkQVqYJvBYqvXqBxZZ',
  },
  {
    symbol: 'CRMx',
    name: 'Salesforce xStock',
    solanaAddress: 'XsczbcQ3zfcgAEt9qHQES8pxKAVG5rujPSHQEXi4kaN',
  },
  {
    symbol: 'SPYx',
    name: 'SP500 xStock',
    solanaAddress: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',
  },
  {
    symbol: 'TBLLx',
    name: 'TBLL xStock',
    solanaAddress: 'XsqBC5tcVQLYt8wqGCHRnAUUecbRYXoJCReD6w7QEKp',
  },
  {
    symbol: 'TSLAx',
    name: 'Tesla xStock',
    solanaAddress: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
  },
  {
    symbol: 'TMOx',
    name: 'Thermo Fisher xStock',
    solanaAddress: 'Xs8drBWy3Sd5QY3aifG9kt9KFs2K3PGZmx7jWrsrk57',
  },
  {
    symbol: 'TONXx',
    name: 'TON xStock',
    solanaAddress: 'XscE4GUcsYhcyZu5ATiGUMmhxYa1D5fwbpJw4K6K4dp',
  },
  {
    symbol: 'TQQQx',
    name: 'TQQQ xStock',
    solanaAddress: 'XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc',
  },
  {
    symbol: 'UNHx',
    name: 'UnitedHealth xStock',
    solanaAddress: 'XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe',
  },
  {
    symbol: 'VTIx',
    name: 'Vanguard xStock',
    solanaAddress: 'XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9',
  },
  {
    symbol: 'Vx',
    name: 'Visa xStock',
    solanaAddress: 'XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p',
  },
  {
    symbol: 'WMTx',
    name: 'Walmart xStock',
    solanaAddress: 'Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci',
  },
];

/**
 * Helper function to get the icon URL for an xStock using MetaMask's static API
 */
export const getXStockIconUrl = (xstock: XStock): string =>
  buildSolanaTokenIconUrl(xstock.solanaAddress);

export const SOLANA_MAINNET_CHAIN_ID = SolScope.Mainnet;
