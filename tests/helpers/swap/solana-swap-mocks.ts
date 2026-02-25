import { Mockttp } from 'mockttp';
// eslint-disable-next-line import/no-extraneous-dependencies
import { WebSocketServer } from 'ws';
import { TestSpecificMock } from '../../framework';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { createLogger } from '../../framework/logger';

const logger = createLogger({ name: 'SolanaSwapMocks' });

const BRIDGE_TX_STATUS_URL_REGEX =
  /^https:\/\/bridge\.(api|dev-api)\.cx\.metamask\.io\/getTxStatus/i;

const SOLANA_CHAIN_ID = 1151111081099710;
const SOLANA_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_RPC_URL_REGEX =
  /^https:\/\/solana-(mainnet|devnet)\.infura\.io\/v3/i;
const SECURITY_ALERTS_SOLANA_SWAP_URL_REGEX =
  /^https:\/\/security-alerts\.api\.cx\.metamask\.io\/solana\/message\/scan/i;

const SOLANA_SWAP_SIGNATURE =
  '2m8z8uPZyoZwQpissDbhSfW5XDTFmpc7cSFithc5e1w8iCwFcvVkxHeaVhgFSdgUPb5cebbKGjuu48JMLPjfEATr';

// Serialized trade payload with fee payer set to mobile test wallet (CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd).
// Based on extension's Solana swap mock trade, re-encoded with the mobile fixture account as fee payer (static account key 0).
const SOLANA_SWAP_TRADE_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAFCabfQGKLeFzC5i9tUg4HLIIV1Pa2+kJ8c2cENe2frl1q6jvO1TG5marlA0p7CAy19kIAOiRh/g7lgPr5va20zjPKjOfUDZs+r0xrnU9RhdULXG0GslfAdb6VzLrDvHYsty5AEdneOs48d43qxNCcoYWjVItgsopQRMMI+vGRP94ZAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVd7TKbS7j3uPy12fc9IgbDFO3W+/9IjTapzlv884ileDteNKFOK8c0hpDuH1r13u1lU4QKNtqrhgsFBgc73APBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPIhbUg9Dagd9kbUso7TAyLLKvv3R6gyTY0Vh4+4cEfNBgQACQOghgEAAAAAAAQABQJ/GgYABQIPBgkAs3QYo39Z6gAHBgABEBESCBAvPpusg80lyVBGFTsAAAAABxwREggAEwcUFQcHAAECEBYUFwwNDg8YFwkKCw8YhQH4xp6R4XWHyAIAAAAlc2nez8aRUOkdj/hBG8ul3jVlousziZMLDcbPOcuzdappXA1qcDzSNL8MAanx41Ji758zFH9Oqugz01qvQFjCAc/r9hYAAAAAuQAAAB8CAAAAA6GU/rAOQizbAyp2zrsCHROKUEYVOwAAAAAD1Q8pCAAAAAAyAAAACAIAAwwCAAAAsIOFAAAAAAADpYT8M/1YgEevM7B7IxKo7BojNrNZru8plWwhku8NV3UACgRiBggMAgdjQrH47VuAcecxlOIwYH4dYzC0X6Dp6hla+BgRRf1xr1LFewPo7OsAU0uKZnzlsA9HVI6xTTDnh5e7UxZgNF2N+CgMgVgPvHoD6uvtAA==';

const SOLANA_TOKENS_RESPONSE = [
  {
    address: '0x0000000000000000000000000000000000000000',
    chainId: SOLANA_CHAIN_ID,
    assetId: `${SOLANA_CAIP}/slip44:501`,
    symbol: 'SOL',
    decimals: 9,
    name: 'SOL',
    aggregators: [],
    occurrences: 100,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
    metadata: {},
  },
  {
    address: 'So11111111111111111111111111111111111111112',
    chainId: SOLANA_CHAIN_ID,
    assetId: `${SOLANA_CAIP}/token:So11111111111111111111111111111111111111112`,
    symbol: 'wSOL',
    decimals: 9,
    name: 'wSOL',
    coingeckoId: 'wrapped-solana',
    aggregators: ['orca', 'jupiter', 'coinGecko', 'lifi'],
    occurrences: 4,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/So11111111111111111111111111111111111111112.png',
    metadata: {},
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: SOLANA_CHAIN_ID,
    assetId: `${SOLANA_CAIP}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    coingeckoId: 'usd-coin',
    aggregators: ['orca', 'jupiter', 'coinGecko', 'lifi'],
    occurrences: 4,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    metadata: {},
  },
];

const SOLANA_POPULAR_TOKENS_RESPONSE = [
  {
    assetId: `${SOLANA_CAIP}/slip44:501`,
    decimals: 9,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
    name: 'SOL',
    symbol: 'SOL',
  },
  {
    assetId: `${SOLANA_CAIP}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    name: 'USD Coin',
    symbol: 'USDC',
  },
];

const quoteSolToUsdcResponse = [
  {
    quote: {
      bridgeId: 'lifi',
      requestId:
        '0xa7362f0f24857e30a28fefbd4139af03e5db5f7004b9d2e1aa3c3e82196e2541',
      aggregator: 'lifi',
      aggregatorType: 'AGG',
      srcChainId: SOLANA_CHAIN_ID,
      srcTokenAmount: '991250000',
      srcAsset: SOLANA_TOKENS_RESPONSE[0],
      destChainId: SOLANA_CHAIN_ID,
      destTokenAmount: '136908757',
      minDestTokenAmount: '136224213',
      destAsset: SOLANA_TOKENS_RESPONSE[2],
      walletAddress: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
      destWalletAddress: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
      feeData: {
        metabridge: {
          amount: '8750000',
          asset: SOLANA_TOKENS_RESPONSE[0],
          quoteBpsFee: 87.5,
          baseBpsFee: 87.5,
        },
      },
      bridges: ['dflow (via LiFi)'],
      protocols: ['dflow (via LiFi)'],
      steps: [
        {
          action: 'swap',
          srcChainId: SOLANA_CHAIN_ID,
          destChainId: SOLANA_CHAIN_ID,
          protocol: {
            name: 'dflow',
            displayName: 'DFlow',
          },
          srcAsset: SOLANA_TOKENS_RESPONSE[0],
          destAsset: SOLANA_TOKENS_RESPONSE[2],
          srcAmount: '991250000',
          destAmount: '136908757',
        },
      ],
      slippage: 0.5,
      priceData: {
        totalFromAmountUsd: '138.1',
        totalToAmountUsd: '136.86795819041402',
        priceImpact: '0.00017288719880388117',
        totalFeeAmountUsd: '1.208375',
      },
    },
    trade: SOLANA_SWAP_TRADE_B64,
    estimatedProcessingTimeInSeconds: 0,
  },
];

const quoteUsdcToSolResponse = [
  {
    quote: {
      bridgeId: 'lifi',
      requestId:
        '0xd9990728abf1185f5accffaf77842ed6744e413ce5a626a63e8f455c26176f78',
      aggregator: 'lifi',
      aggregatorType: 'AGG',
      srcChainId: SOLANA_CHAIN_ID,
      srcTokenAmount: '991250',
      srcAsset: SOLANA_TOKENS_RESPONSE[2],
      destChainId: SOLANA_CHAIN_ID,
      destTokenAmount: '5836864',
      minDestTokenAmount: '5807689',
      destAsset: SOLANA_TOKENS_RESPONSE[0],
      walletAddress: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
      destWalletAddress: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
      feeData: {
        metabridge: {
          amount: '8750',
          asset: SOLANA_TOKENS_RESPONSE[2],
          quoteBpsFee: 87.5,
          baseBpsFee: 87.5,
        },
      },
      bridges: ['jupiter (via LiFi)'],
      protocols: ['jupiter (via LiFi)'],
      steps: [
        {
          action: 'swap',
          srcChainId: SOLANA_CHAIN_ID,
          destChainId: SOLANA_CHAIN_ID,
          protocol: {
            name: 'jupiter',
            displayName: 'Jupiter',
          },
          srcAsset: SOLANA_TOKENS_RESPONSE[2],
          destAsset: SOLANA_TOKENS_RESPONSE[0],
          srcAmount: '982577',
          destAmount: '5836864',
        },
      ],
      slippage: 0.5,
      priceData: {
        totalFromAmountUsd: '0.999772',
        totalToAmountUsd: '0.98421200768',
        priceImpact: '0.015563540807304115',
      },
    },
    trade: SOLANA_SWAP_TRADE_B64,
    estimatedProcessingTimeInSeconds: 0,
  },
];

const SOLANA_SWAP_BLOCKAID_OK_RESPONSE = {
  status: 'OK',
  result: {
    simulation: {},
    validation: {},
  },
};

const getDecodedProxyUrl = (url: string): string => {
  const encodedTarget = new URL(url).searchParams.get('url');
  return encodedTarget ? decodeURIComponent(encodedTarget) : '';
};

const buildJsonRpcResponse = (result: unknown, id?: number | string) => ({
  id: id ?? '1337',
  jsonrpc: '2.0',
  result,
});

const buildSuccessfulTransactionResponse = (signature: string) =>
  buildJsonRpcResponse({
    blockTime: 1748539157,
    meta: {
      err: null,
      fee: 34455,
      status: { Ok: null },
      preBalances: [1533615667, 7648885090],
      postBalances: [1532581212, 7648893840],
      preTokenBalances: [],
      postTokenBalances: [],
    },
    slot: 343287088,
    transaction: {
      message: {
        accountKeys: ['CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd'],
        header: {
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 0,
          numRequiredSignatures: 1,
        },
        instructions: [],
        recentBlockhash: 'CR4RkaZprQixHJC3EQdkcMRte8E3GwLfec6ehefyvtmk',
      },
      signatures: [signature],
    },
    version: 0,
  });

const SOL_TOKEN_INFO = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: SOLANA_CHAIN_ID,
  symbol: 'SOL',
  decimals: 9,
  name: 'SOL',
  coinKey: 'SOL',
  logoURI: '',
  priceUSD: '168.88',
};

const USDC_TOKEN_INFO = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chainId: SOLANA_CHAIN_ID,
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
  coinKey: 'USDC',
  logoURI: '',
  priceUSD: '1.0',
};

const buildBridgeTxStatusResponse = (
  direction: 'sol-to-usdc' | 'usdc-to-sol',
) => {
  const isSolToUsdc = direction === 'sol-to-usdc';
  return {
    status: 'COMPLETE',
    isExpectedToken: true,
    bridge: 'lifi',
    srcChain: {
      chainId: SOLANA_CHAIN_ID,
      txHash: SOLANA_SWAP_SIGNATURE,
      amount: isSolToUsdc ? '1000000000' : '991250',
      token: isSolToUsdc ? SOL_TOKEN_INFO : USDC_TOKEN_INFO,
    },
    destChain: {
      chainId: SOLANA_CHAIN_ID,
      txHash: '',
      amount: isSolToUsdc ? '136908757' : '5836864',
      token: isSolToUsdc ? USDC_TOKEN_INFO : SOL_TOKEN_INFO,
    },
  };
};

const NUM_ALT_ADDRESSES = 247;
const buildAltAddresses = () => {
  const addresses: string[] = [];
  for (let i = 0; i < NUM_ALT_ADDRESSES; i++) {
    const buf = Buffer.alloc(32);
    buf[0] = (i + 1) % 256;
    buf[1] = Math.floor((i + 1) / 256) % 256;
    buf[31] = 1;
    addresses.push(buf.toString('base64'));
  }
  return addresses;
};

const ALT_ACCOUNT_ENTRY = {
  data: {
    parsed: {
      info: {
        addresses: buildAltAddresses(),
        authority: '9RAufBfjGQjDfrwxeyKmZWPADHSb8HcoqCdrmpqvCr1g',
        deactivationSlot: '18446744073709551615',
        lastExtendedSlot: '330440295',
        lastExtendedSlotStartIndex: 0,
      },
      type: 'lookupTable',
    },
    program: 'address-lookup-table',
    space: 56 + NUM_ALT_ADDRESSES * 32,
  },
  executable: false,
  lamports: 58296960,
  owner: 'AddressLookupTab1e1111111111111111111111111',
  rentEpoch: '18446744073709551615',
  space: 56 + NUM_ALT_ADDRESSES * 32,
};

/**
 * Starts a local WebSocket server that mimics Solana JSON-RPC subscriptions.
 * When the app subscribes via `signatureSubscribe`, the server responds with
 * a confirmation notification once the transaction has been submitted.
 */
async function startSolanaWebSocketMock(transactionSubmittedRef: {
  value: boolean;
}): Promise<number> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0 }, () => {
      const addr = wss.address();
      resolve(typeof addr === 'object' && addr !== null ? addr.port : 0);
    });

    wss.on('connection', (ws) => {
      logger.info('Solana WSS mock: client connected');

      ws.on('message', (data) => {
        let msg: { id?: number | string; method?: string };
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        logger.info(
          `Solana WSS mock ← ${msg.method ?? 'unknown'} (id=${msg.id})`,
        );

        if (msg.method === 'signatureSubscribe') {
          const subscriptionId = 1;
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              result: subscriptionId,
              id: msg.id,
            }),
          );

          const pollAndNotify = () => {
            if (transactionSubmittedRef.value) {
              logger.info(
                'Solana WSS mock → signatureNotification (confirmed)',
              );
              ws.send(
                JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'signatureNotification',
                  params: {
                    result: {
                      context: { slot: 343287088 },
                      value: { err: null },
                    },
                    subscription: subscriptionId,
                  },
                }),
              );
            } else {
              setTimeout(pollAndNotify, 200);
            }
          };
          setTimeout(pollAndNotify, 200);
        }
      });
    });
  });
}

export type SolanaSwapScenario = 'sol-to-usdc' | 'usdc-to-sol' | 'no-quotes';

export const buildSolanaSwapTestSpecificMock =
  (scenario: SolanaSwapScenario): TestSpecificMock =>
  async (mockServer: Mockttp) => {
    const quoteResponse =
      scenario === 'sol-to-usdc'
        ? quoteSolToUsdcResponse
        : scenario === 'usdc-to-sol'
          ? quoteUsdcToSolResponse
          : [];

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /getTokens.*chainId=1151111081099710/i,
      response: SOLANA_TOKENS_RESPONSE,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /bridge\.(api|dev-api)\.cx\.metamask\.io\/getTokens/i,
      response: SOLANA_TOKENS_RESPONSE,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: /getTokens\/popular/i,
      response: SOLANA_POPULAR_TOKENS_RESPONSE,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /networks\/1151111081099710\/topAssets\/?/i,
      response: [
        {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'SOL',
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
        },
      ],
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /getQuote/i,
      response: quoteResponse,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /price\.api\.cx\.metamask\.io\/v3\/spot-prices/i,
      response: {
        [`${SOLANA_CAIP}/slip44:501`]: { price: 168.88, usd: 168.88 },
        [`${SOLANA_CAIP}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`]: {
          price: 0.999761,
          usd: 0.999761,
        },
        'eip155:1/slip44:60': { price: 1926.42, usd: 1926.42 },
      },
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: SECURITY_ALERTS_SOLANA_SWAP_URL_REGEX,
      response: SOLANA_SWAP_BLOCKAID_OK_RESPONSE,
      responseCode: 200,
    });

    if (scenario !== 'no-quotes') {
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: BRIDGE_TX_STATUS_URL_REGEX,
        response: buildBridgeTxStatusResponse(scenario),
        responseCode: 200,
      });
    }

    // ── Direct URL rules for transparent proxy ──────────────────────────────
    // When the TransparentProxy server calls this testSpecificMock, traffic arrives
    // as real HTTPS requests (not via /proxy?url=…). The setupMockRequest calls
    // above use the /proxy pattern and are no-ops on the transparent proxy, so we
    // register equivalent rules here that match the actual request URLs.
    // On the regular mock server these rules are no-ops (it only receives /proxy).

    await mockServer
      .forAnyRequest()
      .matching(
        (req) =>
          req.method === 'GET' &&
          /getTokens.*chainId=1151111081099710/i.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({ statusCode: 200, json: SOLANA_TOKENS_RESPONSE }));

    await mockServer
      .forAnyRequest()
      .matching(
        (req) =>
          req.method === 'GET' &&
          /bridge\.(api|dev-api)\.cx\.metamask\.io\/getTokens/i.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({ statusCode: 200, json: SOLANA_TOKENS_RESPONSE }));

    await mockServer
      .forAnyRequest()
      .matching(
        (req) => req.method === 'POST' && /getTokens\/popular/i.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({
        statusCode: 200,
        json: SOLANA_POPULAR_TOKENS_RESPONSE,
      }));

    await mockServer
      .forAnyRequest()
      .matching(
        (req) =>
          req.method === 'GET' &&
          /networks\/1151111081099710\/topAssets\/?/i.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({
        statusCode: 200,
        json: [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'SOL',
          },
          {
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            symbol: 'USDC',
          },
        ],
      }));

    await mockServer
      .forAnyRequest()
      .matching((req) => req.method === 'GET' && /getQuote/i.test(req.url))
      .asPriority(1001)
      .thenCallback(() => ({ statusCode: 200, json: quoteResponse }));

    await mockServer
      .forAnyRequest()
      .matching(
        (req) =>
          req.method === 'GET' &&
          /price\.api\.cx\.metamask\.io\/v3\/spot-prices/i.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({
        statusCode: 200,
        json: {
          [`${SOLANA_CAIP}/slip44:501`]: { price: 168.88, usd: 168.88 },
          [`${SOLANA_CAIP}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`]:
            { price: 0.999761, usd: 0.999761 },
          'eip155:1/slip44:60': { price: 1926.42, usd: 1926.42 },
        },
      }));

    await mockServer
      .forAnyRequest()
      .matching(
        (req) =>
          req.method === 'POST' &&
          SECURITY_ALERTS_SOLANA_SWAP_URL_REGEX.test(req.url),
      )
      .asPriority(1001)
      .thenCallback(() => ({
        statusCode: 200,
        json: SOLANA_SWAP_BLOCKAID_OK_RESPONSE,
      }));

    if (scenario !== 'no-quotes') {
      await mockServer
        .forAnyRequest()
        .matching(
          (req) =>
            req.method === 'GET' && BRIDGE_TX_STATUS_URL_REGEX.test(req.url),
        )
        .asPriority(1001)
        .thenCallback((req) => {
          logger.info(`Bridge getTxStatus hit: ${req.url}`);
          return {
            statusCode: 200,
            json: buildBridgeTxStatusResponse(scenario),
          };
        });
    }
    // ── End direct URL rules ─────────────────────────────────────────────────

    const solanaRpcCorsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'access-control-allow-headers': '*',
    };

    const transactionSubmittedRef = { value: false };
    let actualSwapSignature = SOLANA_SWAP_SIGNATURE;

    // Shared handler for Solana JSON-RPC requests.
    // Used by both the /proxy rule (mock server) and the direct URL rule
    // (transparent proxy) so that transactionSubmitted / actualSwapSignature
    // state is shared regardless of which rule matched.
    const handleSolanaRpc = async (request: {
      body: { getText(): Promise<string | null> };
    }) => {
      let requestBody: unknown;
      try {
        requestBody = JSON.parse((await request.body.getText()) ?? '{}');
      } catch {
        requestBody = {};
      }

      const requestMethod =
        typeof requestBody === 'object' &&
        requestBody !== null &&
        'method' in requestBody &&
        typeof (requestBody as { method?: unknown }).method === 'string'
          ? (requestBody as { method: string }).method
          : undefined;

      const id =
        typeof requestBody === 'object' &&
        requestBody !== null &&
        'id' in requestBody
          ? (requestBody as { id?: number | string }).id
          : undefined;

      logger.info(`Solana RPC → ${requestMethod ?? 'unknown'} (id=${id})`);

      let rpcResponse;
      switch (requestMethod) {
        case 'getBalance':
          rpcResponse = buildJsonRpcResponse(
            {
              context: { apiVersion: '2.0.18', slot: 308460925 },
              value: 50000000000,
            },
            id,
          );
          break;
        case 'getLatestBlockhash':
          rpcResponse = buildJsonRpcResponse(
            {
              context: { apiVersion: '2.0.18', slot: 308460925 },
              value: {
                blockhash: '6E9FiVcuvavWyKTfYC7N9ezJWkNgJVQsroDTHvqApncg',
                lastValidBlockHeight: 341034515,
              },
            },
            id,
          );
          break;
        case 'getFeeForMessage':
          rpcResponse = buildJsonRpcResponse(
            { context: { slot: 5068 }, value: 5000 },
            id,
          );
          break;
        case 'getMinimumBalanceForRentExemption':
          rpcResponse = buildJsonRpcResponse(890880, id);
          break;
        case 'simulateTransaction':
          rpcResponse = buildJsonRpcResponse(
            {
              context: { apiVersion: '2.0.21', slot: 318191894 },
              value: { err: null, logs: [], unitsConsumed: 4794 },
            },
            id,
          );
          break;
        case 'sendTransaction':
          transactionSubmittedRef.value = true;
          rpcResponse = buildJsonRpcResponse(SOLANA_SWAP_SIGNATURE, id);
          break;
        case 'getSignaturesForAddress':
          rpcResponse = transactionSubmittedRef.value
            ? buildJsonRpcResponse(
                [
                  {
                    blockTime: 1748363309,
                    confirmationStatus: 'finalized',
                    err: null,
                    memo: null,
                    signature: actualSwapSignature,
                    slot: 342840492,
                  },
                ],
                id,
              )
            : buildJsonRpcResponse([], id);
          break;
        case 'getTransaction': {
          const txParams =
            typeof requestBody === 'object' &&
            requestBody !== null &&
            'params' in requestBody
              ? (requestBody as { params?: unknown[] }).params
              : undefined;
          const queriedSig =
            Array.isArray(txParams) && typeof txParams[0] === 'string'
              ? txParams[0]
              : actualSwapSignature;
          if (
            transactionSubmittedRef.value &&
            queriedSig !== SOLANA_SWAP_SIGNATURE
          ) {
            actualSwapSignature = queriedSig;
          }
          rpcResponse = buildSuccessfulTransactionResponse(queriedSig);
          break;
        }
        case 'getTokenAccountsByOwner':
          rpcResponse = buildJsonRpcResponse(
            {
              context: { slot: 137568828 },
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          isNative: false,
                          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                          owner: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
                          state: 'initialized',
                          tokenAmount: {
                            amount: '12660400',
                            decimals: 6,
                            uiAmount: 12.6604,
                            uiAmountString: '12.6604',
                          },
                        },
                        type: 'account',
                      },
                      program: 'spl-token',
                      space: 165,
                    },
                    executable: false,
                    lamports: 2039280,
                    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                    rentEpoch: '18446744073709552000',
                    space: 165,
                  },
                  pubkey: 'F77xG4vz2CJeMxxAmFW8pvPx2c5Uk75pksr6Wwx6HFhV',
                },
              ],
            },
            id,
          );
          break;
        case 'getAccountInfo':
          rpcResponse = buildJsonRpcResponse(
            {
              context: { apiVersion: '2.0.21', slot: 317161313 },
              value: {
                data: ['', 'base58'],
                executable: false,
                lamports: 5312114,
                owner: '11111111111111111111111111111111',
                rentEpoch: '18446744073709551615',
                space: 0,
              },
            },
            id,
          );
          break;
        case 'getMultipleAccounts': {
          const params =
            typeof requestBody === 'object' &&
            requestBody !== null &&
            'params' in requestBody
              ? (requestBody as { params?: [string[]] }).params
              : undefined;
          const requestedAccounts = params?.[0] ?? [];
          rpcResponse = buildJsonRpcResponse(
            {
              context: { apiVersion: '2.1.21', slot: 341693911 },
              value: requestedAccounts.map(() => ALT_ACCOUNT_ENTRY),
            },
            id,
          );
          break;
        }
        default:
          rpcResponse = buildJsonRpcResponse(null, id);
          break;
      }

      return {
        statusCode: 200,
        headers: solanaRpcCorsHeaders,
        json: rpcResponse,
      };
    };

    // Mock server proxy rule: app routes RPC via /proxy?url=https://solana-mainnet…
    await mockServer
      .forPost('/proxy')
      .matching((request) =>
        SOLANA_RPC_URL_REGEX.test(getDecodedProxyUrl(request.url)),
      )
      .asPriority(1001)
      .thenCallback(handleSolanaRpc);

    // Direct URL rule for transparent proxy: intercepts real HTTPS RPC calls
    await mockServer
      .forAnyRequest()
      .matching(
        (request) =>
          request.method === 'POST' && SOLANA_RPC_URL_REGEX.test(request.url),
      )
      .asPriority(1001)
      .thenCallback(handleSolanaRpc);

    // Mock Solana RPC WebSocket (signatureSubscribe) so the app receives
    // a confirmation notification for the fake transaction.
    const solanaWsPort = await startSolanaWebSocketMock(
      transactionSubmittedRef,
    );
    logger.info(`Solana WSS mock listening on port ${solanaWsPort}`);

    await mockServer
      .forAnyWebSocket()
      .withUrlMatching(/solana-(mainnet|devnet)\.infura\.io/i)
      .asPriority(1001)
      .thenForwardTo(`ws://localhost:${solanaWsPort}`);
  };
