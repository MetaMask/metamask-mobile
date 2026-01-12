/* eslint-disable no-console */
/**
 * Arbitrum RPC Mocks for Perps E2E Testing
 *
 * Mocks Arbitrum network calls to return static data quickly,
 * preventing long-running network requests that block Detox.
 */

import type { Mockttp } from 'mockttp';
import type { TestSpecificMock } from '../../framework';

// Static mock responses for Arbitrum RPC calls
const MOCK_RESPONSES: Record<string, unknown> = {
  // eth_chainId
  eth_chainId: '0xa4b1', // Arbitrum One chain ID

  // eth_getBalance - mock balance
  eth_getBalance: '0x0', // 0 ETH balance

  // eth_call - contract calls (dinamically overridden in tests)
  eth_call: '0x',

  // eth_estimateGas - gas estimation
  eth_estimateGas: '0x5208', // 21000 gas

  // eth_gasPrice - gas price
  eth_gasPrice: '0x9c7652400', // 42 gwei

  // eth_getTransactionCount - nonce
  eth_getTransactionCount: '0x0',

  // eth_blockNumber - latest block
  eth_blockNumber: '0x1234567',

  // eth_getBlockByNumber - block data
  eth_getBlockByNumber: {
    number: '0x1234567',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
    gasLimit: '0x1c9c380',
    gasUsed: '0x5208',
    transactions: [],
  },

  // net_version
  net_version: '42161', // Arbitrum One network ID
};

/**
 * Simple SVG placeholder for coin images in E2E tests
 */
const MOCK_COIN_SVG = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="lightgray"/>
    <text x="12" y="16" text-anchor="middle" font-size="12" fill="gray">$</text>
  </svg>`;

/**
 * TestSpecificMock function for Perps testing
 * Sets up mocks to prevent live network requests to Arbitrum during E2E tests
 */
export const PERPS_ARBITRUM_MOCKS: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
  const USDC_ARBITRUM_E = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'; // USDC.e (legacy)
  const USDC_ARBITRUM = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'; // Native USDC
  // Encode balanceOf(Account1) result for 200 USDC (6 decimals) => 200000000
  const TWO_HUNDRED_USDC_HEX =
    '0x000000000000000000000000000000000000000000000000000000000bebc200';
  // 100 ETH in wei
  const HUNDRED_ETH_WEI_HEX = '0x56bc75e2d63100000';

  // Mock Arbitrum RPC endpoint through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return Boolean(urlParam?.includes(ARBITRUM_RPC_URL));
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : undefined;

        console.log('[Perps E2E Mock] Intercepted Arbitrum RPC call');

        // Handle batch requests
        if (Array.isArray(body)) {
          const results = body.map((req) => {
            // Special-case eth_getBalance in batch
            if (req.method === 'eth_getBalance') {
              return {
                id: req.id,
                jsonrpc: '2.0',
                result: HUNDRED_ETH_WEI_HEX,
              };
            }
            return {
              id: req.id,
              jsonrpc: '2.0',
              result:
                (MOCK_RESPONSES as Record<string, unknown>)[req.method] || '0x',
            };
          });

          return {
            statusCode: 200,
            body: JSON.stringify(results),
          };
        }

        // Handle single requests
        const method = body?.method as string | undefined;

        // Special-case mock for ERC20 balanceOf(USDC, account) used by Pay with
        if (method === 'eth_call') {
          // Extract call data to detect balanceOf(address)
          try {
            interface EthCallArg {
              to?: string;
              data?: string;
            }
            const params = (body as { params?: EthCallArg[] })?.params ?? [];
            const arg0 = (params[0] as EthCallArg | undefined) || undefined;
            const to = arg0?.to?.toLowerCase?.();
            const data: string | undefined = arg0?.data;
            // ERC20 balanceOf selector 0x70a08231
            const isBalanceOf =
              typeof data === 'string' && data.startsWith('0x70a08231');
            if (
              (to === USDC_ARBITRUM || to === USDC_ARBITRUM_E) &&
              isBalanceOf
            ) {
              return {
                statusCode: 200,
                body: JSON.stringify({
                  id: body?.id ?? 1,
                  jsonrpc: '2.0',
                  result: TWO_HUNDRED_USDC_HEX,
                }),
              };
            }
          } catch (e) {
            // fall back
          }
        }

        // Special-case mock for native ETH balance on Arbitrum
        if (method === 'eth_getBalance') {
          return {
            statusCode: 200,
            body: JSON.stringify({
              id: body?.id ?? 1,
              jsonrpc: '2.0',
              result: HUNDRED_ETH_WEI_HEX,
            }),
          };
        }

        const result = method
          ? (MOCK_RESPONSES as Record<string, unknown>)[method] || '0x'
          : '0x';

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result,
          }),
        };
      } catch (error) {
        console.log('[Perps E2E Mock] Error parsing request body:', error);
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            result: '0x',
          }),
        };
      }
    });

  // Mock HyperLiquid Exchange API GET requests through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('api.hyperliquid.xyz/exchange');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted HyperLiquid Exchange GET');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock HyperLiquid Exchange API POST requests through the mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('api.hyperliquid.xyz/exchange');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted HyperLiquid Exchange POST');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock Rewards API for perps fee discount through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return (
        urlParam.includes('rewards') && urlParam.includes('perps-fee-discount')
      );
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log(
        '[Perps E2E Mock] Intercepted Rewards perps-fee-discount request',
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          discountPercentage: 0,
          eligible: false,
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock HyperLiquid coin image requests through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url');
      return urlParam
        ? /^https:\/\/app\.hyperliquid\.xyz\/coins\/.*\.svg$/.test(urlParam)
        : false;
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log(
        '[Perps E2E Mock] Intercepted HyperLiquid coin image request',
      );
      return {
        statusCode: 200,
        body: MOCK_COIN_SVG,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      };
    });

  // Mock Accounts API (balances/relationships) through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('accounts.api.cx.metamask.io');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted Accounts API request');
      return {
        statusCode: 200,
        body: JSON.stringify({ data: [], included: [] }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    });

  // Mock Token API metadata through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('token.api.cx.metamask.io/token/42161');
    })
    .asPriority(1000)
    .thenCallback((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      const url = new URL(urlParam);
      const address = (url.searchParams.get('address') || '').toLowerCase();
      console.log(
        '[Perps E2E Mock] Intercepted Token API request for',
        address,
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          address,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId: 42161,
          logo: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock Tx Sentinel POST via mobile proxy
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes(
        'tx-sentinel-arbitrum-mainnet.api.cx.metamask.io',
      );
    })
    .asPriority(1000)
    .thenCallback(async () => {
      console.log('[Perps E2E Mock] Intercepted Tx Sentinel request');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' }),
        headers: { 'Content-Type': 'application/json' },
      };
    });

  // Mock HyperLiquid coin image requests through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('price.api.cx.metamask.io/v2/chains/0xa4b1');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted Price API request');
      return {
        statusCode: 200,
        body: JSON.stringify({
          '0x0000000000000000000000000000000000000000': {
            id: 'ethereum',
            price: 0.999972651206969,
            marketCap: 120787455.213762,
            allTimeHigh: 1.65971963862127,
            allTimeLow: 0.000145292455476714,
            totalVolume: 9428228.34684131,
            high1d: 1.06408228150965,
            low1d: 0.998174024572987,
            circulatingSupply: 120695108.243547,
            dilutedMarketCap: 120787455.213762,
            marketCapPercentChange1d: -3.65305,
            priceChange1d: -113.150069710762,
            pricePercentChange1h: -1.10669232294285,
            pricePercentChange1d: -3.65812325301973,
            pricePercentChange7d: -4.13635493022624,
            pricePercentChange14d: 8.3078065082939,
            pricePercentChange30d: -6.40996979150269,
            pricePercentChange200d: 12.4178771617204,
            pricePercentChange1y: -23.4708803114256,
          },
          '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': {
            id: 'usd-coin-ethereum-bridged',
            price: 0.000335227092460614,
            marketCap: 21157.8427362164,
            allTimeHigh: 0.00040938889803337,
            allTimeLow: 0.000301975989258871,
            totalVolume: 18020.9748003926,
            high1d: 0.000338249187883309,
            low1d: 0.000327180587226235,
            circulatingSupply: 63135587.501145,
            dilutedMarketCap: 21157.8427362164,
            marketCapPercentChange1d: -0.07227,
            priceChange1d: -0.000314609931530985,
            pricePercentChange1h: 0.315821469792684,
            pricePercentChange1d: -0.0314827666724661,
            pricePercentChange7d: -0.118860132989052,
            pricePercentChange14d: 0.458309784944713,
            pricePercentChange30d: -0.329602840383663,
            pricePercentChange200d: 0.0819372345276349,
            pricePercentChange1y: -0.155248818485504,
          },
          '0xaf88d065e77c8cc2239327c5edb3a432268e5831': {
            id: 'usd-coin',
            price: 0.000335558630355087,
            marketCap: 26323870.6148644,
            allTimeHigh: 0.000392610664507413,
            allTimeLow: 0.000294507326387126,
            totalVolume: 3835411.26953233,
            high1d: 0.000335564670519156,
            low1d: 0.000335358633811457,
            circulatingSupply: 78452801620.0186,
            dilutedMarketCap: 26327173.2440294,
            marketCapPercentChange1d: 0.03968,
            priceChange1d: 0.00004574,
            pricePercentChange1h: 0.0119513851718319,
            pricePercentChange1d: 0.00457461979403909,
            pricePercentChange7d: 0.0172715843309844,
            pricePercentChange14d: 0.0182646657767789,
            pricePercentChange30d: 0.0172178802381209,
            pricePercentChange200d: 0.0204803951277851,
            pricePercentChange1y: 0.0285034972599191,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      };
    });

  // Mock HyperLiquid coin image requests through the mobile proxy
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('price.api.cx.metamask.io/v2/chains/0x89');
    })
    .asPriority(1000)
    .thenCallback(() => {
      console.log('[Perps E2E Mock] Intercepted Price API request');
      return {
        statusCode: 200,
        body: JSON.stringify({
          '0x0000000000000000000000000000000000001010': {
            id: 'polygon-ecosystem-token',
            price: 0.113006,
            marketCap: 1192507260,
            allTimeHigh: 1.29,
            allTimeLow: 0.113362,
            totalVolume: 75356551,
            high1d: 0.121302,
            low1d: 0.112985,
            circulatingSupply: 10556415953.6597,
            dilutedMarketCap: 1192507260,
            marketCapPercentChange1d: -4.20683,
            priceChange1d: -0.00501858069982855,
            pricePercentChange1h: -1.35595913652185,
            pricePercentChange1d: -4.25215808442668,
            pricePercentChange7d: -8.79747323054775,
            pricePercentChange14d: -5.38334147678743,
            pricePercentChange30d: -27.5942103216344,
            pricePercentChange200d: -50.7418828223079,
            pricePercentChange1y: -81.5387418720344,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      };
    });
};
