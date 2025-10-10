#!/usr/bin/env node

/**
 * Comprehensive Mock Server for MetaMask Mobile Maestro Tests
 * Replicates all 27 API endpoints from Detox E2E test infrastructure
 */

import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

interface MockResponse {
  status: number;
  response: any;
}

interface MockResponses {
  [key: string]: MockResponse;
}

// Import all mock responses from the actual E2E test constants
const COMPREHENSIVE_MOCK_RESPONSES: MockResponses = {
  // Web3Auth API
  'api.web3auth.io/fnd-service/node-details': {
    status: 200,
    response: {
      "torusNodeEndpoints": ["https://node-1.web3auth.io", "https://node-2.web3auth.io"],
      "torusNodePub": [
        {"X": "abc123", "Y": "def456"},
        {"X": "ghi789", "Y": "jkl012"}
      ]
    }
  },

  // Geolocation API
  'on-ramp.dev-api.cx.metamask.io/geolocation': {
    status: 200,
    response: {
      "country": "US",
      "region": "CA",
      "city": "San Francisco"
    }
  },

  // Polymarket Geoblock
  'polymarket.com/api/geoblock': {
    status: 200,
    response: { "blocked": false }
  },

  // Contentful Promotional Banners - Prevent "Perps are here" and other promotional screens
  'cdn.contentful.com': {
    status: 200,
    response: {
      "sys": { "type": "Array" },
      "total": 0,
      "skip": 0,
      "limit": 100,
      "items": []
    }
  },

  // Specific promotional banner endpoint
  'cdn.contentful.com/spaces/*/entries?content_type=promotionalBanner': {
    status: 200,
    response: {
      "sys": { "type": "Array" },
      "total": 0,
      "skip": 0,
      "limit": 100,
      "items": []
    }
  },

  // Client Config Flags - Disable perps to prevent promotional screens
  'client-config.api.cx.metamask.io/v1/flags': {
    status: 200,
    response: {
      "swaps": { "enabled": true },
      "smartTransactions": { "enabled": false },
      "notifications": { "enabled": true },
      "perpsEnabled": false,
      "perpsPerpTradingEnabled": { "enabled": false },
      "carouselBanners": false
    }
  },

  // Staking APIs
  'staking.api.cx.metamask.io/v1/lending/1/markets': {
    status: 200,
    response: []
  },

  'staking.api.cx.metamask.io/v1/lending/markets': {
    status: 200,
    response: []
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/1': {
    status: 200,
    response: {
      "vaultAddress": "0x1234567890123456789012345678901234567890",
      "capacity": "1000000000000000000000000"
    }
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys': {
    status: 200,
    response: [{ "apy": "0.05", "date": "2025-10-09" }]
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/1/apys/averages': {
    status: 200,
    response: { "average": "0.05" }
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/560048': {
    status: 200,
    response: {
      "vaultAddress": "0x9876543210987654321098765432109876543210",
      "capacity": "2000000000000000000000000"
    }
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/560048/apys': {
    status: 200,
    response: [{ "apy": "0.04", "date": "2025-10-09" }]
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/vault/560048/apys/averages': {
    status: 200,
    response: { "average": "0.04" }
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/stakes/1': {
    status: 200,
    response: []
  },

  'staking.api.cx.metamask.io/v1/pooled-staking/eligibility': {
    status: 200,
    response: { "eligible": true }
  },

  'staking.api.cx.metamask.io/v1/lending/positions': {
    status: 200,
    response: []
  },

  // Accounts API
  'accounts.api.cx.metamask.io/v1/accounts': {
    status: 200,
    response: { "transactions": [] }
  },

  'accounts.api.cx.metamask.io/v1/supportedNetworks': {
    status: 200,
    response: ["1", "137", "56", "43114"]
  },

  'accounts.api.cx.metamask.io/v2/accounts': {
    status: 200,
    response: { "balances": [] }
  },

  'accounts.api.cx.metamask.io/v2/activeNetworks': {
    status: 200,
    response: ["1"]
  },

  'accounts.api.cx.metamask.io/v1/metadata': {
    status: 200,
    response: {}
  },

  // DeFi Adapters
  'defiadapters.api.cx.metamask.io/positions': {
    status: 200,
    response: []
  },

  // On-ramp APIs
  'on-ramp-cache.uat-api.cx.metamask.io/regions/networks': {
    status: 200,
    response: { "networks": ["ethereum", "polygon"] }
  },

  // Swap APIs (from our constants)
  'swap.api.cx.metamask.io/featureFlags': {
    status: 200,
    response: {
      ethereum: { fallbackToV1: false, mobileActive: true, extensionActive: true },
      bsc: { fallbackToV1: false, mobileActive: true, extensionActive: true },
      polygon: { fallbackToV1: false, mobileActive: true, extensionActive: true },
      avalanche: { fallbackToV1: false, mobileActive: true, extensionActive: true },
      smartTransactions: { mobileActive: false, extensionActive: false },
      multiChainAssets: { pollingSeconds: 0 }
    }
  },

  // Bridge/Swap Quote API (test-specific mock)
  'bridge.api.cx.metamask.io/getQuote': {
    status: 200,
    response: [{
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
          metadata: {}
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
          metadata: { storage: { balance: 9, approval: 10 } }
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
              metadata: {}
            }
          }
        },
        bridges: ['kyberswap'],
        protocols: ['kyberswap'],
        steps: [],
        priceData: {
          totalFromAmountUsd: '4496.87',
          totalToAmountUsd: '4456.264231788599',
          priceImpact: '0.009029784763935933'
        }
      },
      trade: {
        chainId: 1,
        to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
        from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
        value: '0xde0b6b3a7640000',
        data: '0x5f575529000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136b796265725377617046656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000009a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000000010858e8f90000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915',
        gasLimit: 406184
      },
      estimatedProcessingTimeInSeconds: 0
    }]
  },

  'bridge.api.cx.metamask.io/networks/1/topAssets': {
    status: 200,
    response: [
      { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH' },
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC' }
    ]
  },

  // Price APIs
  'price.api.cx.metamask.io/v2/chains/1/spot-prices': {
    status: 200,
    response: {
      '0x0000000000000000000000000000000000000000': { usd: 4583.48 },
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { usd: 0.999806 }
    }
  },

  'price.api.cx.metamask.io/v3/spot-prices': {
    status: 200,
    response: {
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { usd: 0.999806 },
      'eip155:1/slip44:60': { usd: 4583.48 }
    }
  },

  'min-api.cryptocompare.com/data/pricemulti': {
    status: 200,
    response: {
      ETH: { usd: 4583.48 },
      BTC: { usd: 65000 },
      SOL: { usd: 150 }
    }
  },

  // Token API
  'token.api.cx.metamask.io/tokens/1': {
    status: 200,
    response: [
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
        metadata: {}
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
        metadata: { storage: { balance: 9, approval: 10 } }
      }
    ]
  },

  // Gas API
  'gas.api.cx.metamask.io/networks/1/suggestedGasFees': {
    status: 200,
    response: {
      low: { suggestedMaxFeePerGas: '20', suggestedMaxPriorityFeePerGas: '1' },
      medium: { suggestedMaxFeePerGas: '25', suggestedMaxPriorityFeePerGas: '2' },
      high: { suggestedMaxFeePerGas: '30', suggestedMaxPriorityFeePerGas: '3' }
    }
  },

  // User Storage APIs
  'user-storage.api.cx.metamask.io/api/v1/userstorage': {
    status: 200,
    response: {}
  },

  // Notification APIs
  'push.api.cx.metamask.io/api/v2/token': {
    status: 200,
    response: { token: 'mock-token' }
  },

  'notification.api.cx.metamask.io/api/v2/notifications': {
    status: 200,
    response: []
  },

  'trigger.api.cx.metamask.io/api/v2/notifications': {
    status: 200,
    response: []
  },

  // WalletConnect
  'pulse.walletconnect.org/batch': {
    status: 200,
    response: { success: true }
  },

  // MetaMetrics
  'metametrics.test/track': {
    status: 200,
    response: { success: true }
  }
};

// Create HTTP server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  const hostname = req.headers.host || '';

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
  let mockData: MockResponse | null = null;
  const fullUrl = hostname + pathname;
  
  for (const [urlPattern, mockResponse] of Object.entries(COMPREHENSIVE_MOCK_RESPONSES)) {
    if (fullUrl.includes(urlPattern) || pathname.includes(urlPattern)) {
      mockData = mockResponse;
      break;
    }
  }

  if (mockData) {
    res.writeHead(mockData.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData.response));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', url: fullUrl }));
  }
});

// Start server
const PORT = process.env.MOCK_SERVER_PORT || 8000;
server.listen(PORT, () => {
  // Write PID file for cleanup
  fs.writeFileSync('/tmp/metamask-comprehensive-mock-server.pid', process.pid.toString());
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
