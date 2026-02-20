import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

const SOLANA_CHAIN_ID = 1151111081099710;
const SOLANA_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_RPC_URL_REGEX =
  /^https:\/\/solana-(mainnet|devnet)\.infura\.io\/v3/i;
const SECURITY_ALERTS_SOLANA_SWAP_URL_REGEX =
  /^https:\/\/security-alerts\.api\.cx\.metamask\.io\/solana\/message\/scan/i;

const SOLANA_SWAP_SIGNATURE =
  '2m8z8uPZyoZwQpissDbhSfW5XDTFmpc7cSFithc5e1w8iCwFcvVkxHeaVhgFSdgUPb5cebbKGjuu48JMLPjfEATr';

// Real serialized trade payload from extension Solana swap mocks.
const SOLANA_SWAP_TRADE_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAFCTmygAPBLRe3kUHSV8mUto3dI7jXb1Ec0ljkAzmT+/9X6jvO1TG5marlA0p7CAy19kIAOiRh/g7lgPr5va20zjPKjOfUDZs+r0xrnU9RhdULXG0GslfAdb6VzLrDvHYsty5AEdneOs48d43qxNCcoYWjVItgsopQRMMI+vGRP94ZAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAoPQ3SgjVP7wrjsOIn03zYnKJm+xfd+PfLfM775OvcVd7TKbS7j3uPy12fc9IgbDFO3W+/9IjTapzlv884ileDteNKFOK8c0hpDuH1r13u1lU4QKNtqrhgsFBgc73APBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPIhbUg9Dagd9kbUso7TAyLLKvv3R6gyTY0Vh4+4cEfNBgQACQOghgEAAAAAAAQABQJ/GgYABQIPBgkAs3QYo39Z6gAHBgABEBESCBAvPpusg80lyVBGFTsAAAAABxwREggAEwcUFQcHAAECEBYUFwwNDg8YFwkKCw8YhQH4xp6R4XWHyAIAAAAlc2nez8aRUOkdj/hBG8ul3jVlousziZMLDcbPOcuzdappXA1qcDzSNL8MAanx41Ji758zFH9Oqugz01qvQFjCAc/r9hYAAAAAuQAAAB8CAAAAA6GU/rAOQizbAyp2zrsCHROKUEYVOwAAAAAD1Q8pCAAAAAAyAAAACAIAAwwCAAAAsIOFAAAAAAADpYT8M/1YgEevM7B7IxKo7BojNrNZru8plWwhku8NV3UACgRiBggMAgdjQrH47VuAcecxlOIwYH4dYzC0X6Dp6hla+BgRRf1xr1LFewPo7OsAU0uKZnzlsA9HVI6xTTDnh5e7UxZgNF2N+CgMgVgPvHoD6uvtAA==';

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
      walletAddress: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
      destWalletAddress: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
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
      walletAddress: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
      destWalletAddress: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
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
        accountKeys: ['4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer'],
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

    await mockServer
      .forPost('/proxy')
      .matching((request) =>
        SOLANA_RPC_URL_REGEX.test(getDecodedProxyUrl(request.url)),
      )
      .asPriority(1001)
      .thenCallback(async (request) => {
        let requestBody: unknown;
        try {
          requestBody = JSON.parse(await request.body.getText());
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

        switch (requestMethod) {
          case 'getBalance':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.0.18', slot: 308460925 },
                  value: 50000000000,
                },
                id,
              ),
            };
          case 'getLatestBlockhash':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.0.18', slot: 308460925 },
                  value: {
                    blockhash: '6E9FiVcuvavWyKTfYC7N9ezJWkNgJVQsroDTHvqApncg',
                    lastValidBlockHeight: 341034515,
                  },
                },
                id,
              ),
            };
          case 'getFeeForMessage':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                { context: { slot: 5068 }, value: 5000 },
                id,
              ),
            };
          case 'getMinimumBalanceForRentExemption':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(890880, id),
            };
          case 'simulateTransaction':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.0.21', slot: 318191894 },
                  value: { err: null, logs: [], unitsConsumed: 4794 },
                },
                id,
              ),
            };
          case 'sendTransaction':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(SOLANA_SWAP_SIGNATURE, id),
            };
          case 'getSignaturesForAddress':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                [
                  {
                    blockTime: 1748363309,
                    confirmationStatus: 'finalized',
                    err: null,
                    memo: null,
                    signature: SOLANA_SWAP_SIGNATURE,
                    slot: 342840492,
                  },
                ],
                id,
              ),
            };
          case 'getTransaction':
            return {
              statusCode: 200,
              json: buildSuccessfulTransactionResponse(SOLANA_SWAP_SIGNATURE),
            };
          case 'getTokenAccountsByOwner':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
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
                              owner:
                                '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
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
              ),
            };
          case 'getAccountInfo':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
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
              ),
            };
          case 'getMultipleAccounts':
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.1.21', slot: 341693911 },
                  value: [],
                },
                id,
              ),
            };
          default:
            return {
              statusCode: 200,
              json: buildJsonRpcResponse(null, id),
            };
        }
      });
  };
