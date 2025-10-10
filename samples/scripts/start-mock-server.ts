#!/usr/bin/env node

/**
 * Mock server for MetaMask Mobile Maestro tests
 * Provides mocked API responses for swap functionality
 */

import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

interface MockResponses {
  [key: string]: any;
}

// Mock responses based on e2e/specs/swaps/helpers/constants.ts
const MOCK_RESPONSES: MockResponses = {
  // Price API response
  '/v3/spot-prices': {
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
      usd: 0.999806,
    },
    'eip155:1/slip44:60': { usd: 4583.48 },
  },

  // ETH->USDC quote response
  '/getQuote': {
    quote: {
      requestId: '0xfc2429bdb2a5693e48f1b3b9e0bc01c141a3f9ea1261c9bce358112d95dfbbf0',
      bridgeId: 'kyberswap',
      srcChainId: 1,
      destChainId: 1,
      aggregator: 'kyberswap',
      aggregatorType: 'AGG',
      srcAsset: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 1,
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        coingeckoId: 'ethereum',
        aggregators: [],
        occurrences: 100,
        iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
        metadata: {},
      },
      srcTokenAmount: '991250000000000000',
      destAsset: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 1,
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USDC',
        coingeckoId: 'usd-coin',
        aggregators: ['uniswapLabs', 'metamask', 'aave', 'coinGecko'],
        occurrences: 17,
        iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        metadata: {
          storage: {
            balance: 9,
            approval: 10,
          },
        },
      },
      destTokenAmount: '4457298325',
      minDestTokenAmount: '4435011833',
      walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      destWalletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      feeData: {
        metabridge: {
          amount: '8750000000000000',
          asset: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: 1,
            assetId: 'eip155:1/slip44:60',
            symbol: 'ETH',
            decimals: 18,
            name: 'Ethereum',
            coingeckoId: 'ethereum',
            aggregators: [],
            occurrences: 100,
            iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
            metadata: {},
          },
        },
      },
      bridges: ['kyberswap'],
      protocols: ['kyberswap'],
      steps: [],
      priceData: {
        totalFromAmountUsd: '4496.87',
        totalToAmountUsd: '4456.264231788599',
        priceImpact: '0.009029784763935933',
      },
    },
    trade: {
      chainId: 1,
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0xde0b6b3a7640000',
      data: '0x5f575529000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136b796265725377617046656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000009a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000000010858e8f90000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915',
      gasLimit: 406184,
    },
    estimatedProcessingTimeInSeconds: 0,
  },

  // Token list response
  '/getTokens': [
    {
      address: '0x0000000000000000000000000000000000000000',
      chainId: 1,
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
      coingeckoId: 'ethereum',
      aggregators: [],
      occurrences: 100,
      iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      metadata: {},
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: 1,
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      decimals: 6,
      name: 'USDCoin',
      coingeckoId: 'usd-coin',
      aggregators: ['uniswapLabs', 'metamask', 'aave', 'coinGecko'],
      occurrences: 17,
      iconUrl: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
      metadata: {
        storage: {
          balance: 9,
          approval: 10,
        },
      },
    },
  ],

  // Feature flags response
  '/featureFlags': {
    ethereum: { fallbackToV1: false, mobileActive: true, extensionActive: true },
    bsc: { fallbackToV1: false, mobileActive: true, extensionActive: true },
    polygon: { fallbackToV1: false, mobileActive: true, extensionActive: true },
    avalanche: { fallbackToV1: false, mobileActive: true, extensionActive: true },
    smartTransactions: {
      mobileActive: false,
      extensionActive: false,
    },
    multiChainAssets: { pollingSeconds: 0 },
  },
};

// Create HTTP server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Find matching mock response
  let response: any = null;
  for (const [path, mockResponse] of Object.entries(MOCK_RESPONSES)) {
    if (pathname.includes(path)) {
      response = mockResponse;
      break;
    }
  }

  if (response) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
const PORT = process.env.MOCK_SERVER_PORT || 3001;
server.listen(PORT, () => {
  // Write PID file for cleanup
  fs.writeFileSync('/tmp/metamask-mock-server.pid', process.pid.toString());
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
