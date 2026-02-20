import { Mockttp } from 'mockttp';
import { base58 } from 'ethers/lib/utils';
import { TestSpecificMock } from '../../framework';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

const SOLANA_CHAIN_ID = 1151111081099710;
const SOLANA_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_RPC_URL_REGEX =
  /^https:\/\/solana-(mainnet|devnet)\.infura\.io\/v3/i;
const SECURITY_ALERTS_SOLANA_SWAP_URL_REGEX =
  /^https:\/\/security-alerts\.api\.cx\.metamask\.io\/solana\/message\/scan/i;

const SOL_TO_USDC_SWAP_SIGNATURE =
  '2m8z8uPZyoZwQpissDbhSfW5XDTFmpc7cSFithc5e1w8iCwFcvVkxHeaVhgFSdgUPb5cebbKGjuu48JMLPjfEATr';
const USDC_TO_SOL_SWAP_SIGNATURE =
  '28rWme56aMyaP8oX18unFeZg65iyDEhjLhvMBpxyFgKcn38P37ZRsssSZoHDCCr5xUfwfpqsVSSBoShLitHQLdrr';

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

const SOL_USDC_TRANSACTION_RESPONSE = {
  id: '1337',
  jsonrpc: '2.0',
  result: {
    blockTime: 1748539157,
    meta: {
      computeUnitsConsumed: 129912,
      err: null,
      fee: 34455,
      innerInstructions: [
        { index: 2, instructions: [] },
        { index: 5, instructions: [] },
      ],
      loadedAddresses: {
        readonly: [
          '8NsPwRFYqob3FzYvHYTjFK6WVFJADFN8Hn7yNQKcVNW1',
          'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt',
          'J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt',
          'So11111111111111111111111111111111111111112',
        ],
        writable: [
          '2SgUGxYDczrB6wUzXHPJH65pNhWkEzNMEx3km4xTYUTC',
          '3f9kSZg8PPJ6NkLwVdXeff16ZT1XbkmT5eaQCqUnpDWx',
          '4maNZQtYFA1cdB55aLS321dxwdH1Y8NWaH4qiMedKpTZ',
          'FaF5XKRqTNaQ7zXwYNtpig2Q1HArtzJK4xB8XxHERF2j',
        ],
      },
      logMessages: [],
      postBalances: [
        1532581212, 7648893840, 2039280, 0, 1, 731913600, 1, 1017968,
        391278827123, 1141440, 934087680, 17903222, 24039280, 27021899342,
        78139920, 1405920, 1141440, 32151736, 1045539216193,
      ],
      postTokenBalances: [
        {
          accountIndex: 2,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '12827324',
            decimals: 6,
            uiAmount: 12.827324,
            uiAmountString: '12.827324',
          },
        },
        {
          accountIndex: 12,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: 'J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '3902878273',
            decimals: 6,
            uiAmount: 3902.878273,
            uiAmountString: '3902.878273',
          },
        },
        {
          accountIndex: 13,
          mint: 'So11111111111111111111111111111111111111112',
          owner: 'J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '27019860062',
            decimals: 9,
            uiAmount: 27.019860062,
            uiAmountString: '27.019860062',
          },
        },
      ],
      preBalances: [
        1533615667, 7648885090, 2039280, 0, 1, 731913600, 1, 1017968,
        391278827123, 1141440, 934087680, 17903222, 24039280, 27020908092,
        78139920, 1405920, 1141440, 32151736, 1045539216193,
      ],
      preTokenBalances: [
        {
          accountIndex: 2,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '12660400',
            decimals: 6,
            uiAmount: 12.6604,
            uiAmountString: '12.6604',
          },
        },
        {
          accountIndex: 12,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: 'J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '3903045197',
            decimals: 6,
            uiAmount: 3903.045197,
            uiAmountString: '3903.045197',
          },
        },
        {
          accountIndex: 13,
          mint: 'So11111111111111111111111111111111111111112',
          owner: 'J4uBbeoWpZE8fH58PM1Fp9n9K6f1aThyeVCyRdJbaXqt',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '27018868812',
            decimals: 9,
            uiAmount: 27.018868812,
            uiAmountString: '27.018868812',
          },
        },
      ],
      rewards: [],
      status: { Ok: null },
    },
    slot: 343287088,
    transaction: {
      message: {
        accountKeys: [
          '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
          '4cLUBQKZgCv2AqGXbh8ncGhrDRcicUe3WSDzjgPY2oTA',
          'F77xG4vz2CJeMxxAmFW8pvPx2c5Uk75pksr6Wwx6HFhV',
          'Ffqao4nxSvgaR5kvFz1F718WaxSv6LnNfHuGqFEZ8fzL',
          '11111111111111111111111111111111',
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
          'ComputeBudget111111111111111111111111111111',
          'D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf',
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        ],
        addressTableLookups: [
          {
            accountKey: 'G6EBADumaU4MaifUPMYY77Ao74ogBSwGDsavzcmYRkUA',
            readonlyIndexes: [129, 128, 204, 55],
            writableIndexes: [205, 203, 199, 206],
          },
        ],
        header: {
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 7,
          numRequiredSignatures: 1,
        },
        instructions: [],
        recentBlockhash: 'CR4RkaZprQixHJC3EQdkcMRte8E3GwLfec6ehefyvtmk',
      },
      signatures: [SOL_TO_USDC_SWAP_SIGNATURE],
    },
    version: 0,
  },
} as const;

const USDC_SOL_TRANSACTION_RESPONSE = {
  id: '1337',
  jsonrpc: '2.0',
  result: {
    blockTime: 1748545222,
    meta: {
      computeUnitsConsumed: 101807,
      err: null,
      fee: 17129,
      innerInstructions: [
        { index: 2, instructions: [] },
        { index: 3, instructions: [] },
      ],
      loadedAddresses: {
        readonly: [
          'J4HJYz4p7TRP96WVFky3vh7XryxoFehHjoRySUTeSeXw',
          'obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y',
          'So11111111111111111111111111111111111111112',
          'Sysvar1nstructions1111111111111111111111111',
        ],
        writable: [
          '86KSdCfcqnJo9TCLFi3zxsJAJzvx9QU7oEPd6Fn5ZPom',
          '8ofECjHnVGLU4ywyPdK6mFddEqAuXsnrrov8m2zeFhvj',
          'Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK',
          'FpCMFDFGYotvufJ7HrFHsWEiiQCGbkLCtwHiDnh7o28Q',
        ],
      },
      logMessages: [],
      postBalances: [
        1538468067, 2039280, 0, 2039280, 1, 29900160, 731913600, 1, 1017968,
        8741760, 1141440, 934087680, 224715580269, 2039280, 5526241, 3167032033,
        2561280, 1141440, 1045539216193, 0,
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '3xTPAZxmpwd8GrNEKApaTw6VH4jqJ31WFXUvQzgwhR7c',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '11827324',
            decimals: 6,
            uiAmount: 11.827324,
            uiAmountString: '11.827324',
          },
        },
        {
          accountIndex: 3,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '4cLUBQKZgCv2AqGXbh8ncGhrDRcicUe3WSDzjgPY2oTA',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '244533398',
            decimals: 6,
            uiAmount: 244.533398,
            uiAmountString: '244.533398',
          },
        },
        {
          accountIndex: 12,
          mint: 'So11111111111111111111111111111111111111112',
          owner: 'Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '224713540988',
            decimals: 9,
            uiAmount: 224.713540988,
            uiAmountString: '224.713540988',
          },
        },
        {
          accountIndex: 13,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: 'Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '123014937192',
            decimals: 6,
            uiAmount: 123014.937192,
            uiAmountString: '123014.937192',
          },
        },
      ],
      preBalances: [
        1532581212, 2039280, 0, 2039280, 1, 29900160, 731913600, 1, 1017968,
        8741760, 1141440, 934087680, 224721484253, 2039280, 5526241, 3167032033,
        2561280, 1141440, 1045539216193, 0,
      ],
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '12827324',
            decimals: 6,
            uiAmount: 12.827324,
            uiAmountString: '12.827324',
          },
        },
        {
          accountIndex: 3,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: '4cLUBQKZgCv2AqGXbh8ncGhrDRcicUe3WSDzjgPY2oTA',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '244524648',
            decimals: 6,
            uiAmount: 244.524648,
            uiAmountString: '244.524648',
          },
        },
        {
          accountIndex: 12,
          mint: 'So11111111111111111111111111111111111111112',
          owner: 'Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '224719444972',
            decimals: 9,
            uiAmount: 224.719444972,
            uiAmountString: '224.719444972',
          },
        },
        {
          accountIndex: 13,
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          owner: 'Fn68NZzCCgZKtYmnAYbkL6w5NNx3TgjW91dGkLA3hsDK',
          programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          uiTokenAmount: {
            amount: '123013945942',
            decimals: 6,
            uiAmount: 123013.945942,
            uiAmountString: '123013.945942',
          },
        },
      ],
      rewards: [],
      status: { Ok: null },
    },
    slot: 343302515,
    transaction: {
      message: {
        accountKeys: [
          '4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
          'F77xG4vz2CJeMxxAmFW8pvPx2c5Uk75pksr6Wwx6HFhV',
          'Ffqao4nxSvgaR5kvFz1F718WaxSv6LnNfHuGqFEZ8fzL',
          'H4FVf2mGfHN26D1CkZ6sJAb6xUhhnW1w9abpaxHnUbUD',
          '11111111111111111111111111111111',
          '6YawcNeZ74tRyCv4UfGydYMr7eho7vbUR6ScVffxKAb3',
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
          'ComputeBudget111111111111111111111111111111',
          'D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf',
          'GZsNmWKbqhMYtdSkkvMdEyQF9k5mLmP7tTKYWZjcHVPE',
          'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        ],
        addressTableLookups: [
          {
            accountKey: 'HPLCVFcCMgt6mp5uZLo9u8WnqAe2Yan7Sf285fRmitYP',
            readonlyIndexes: [14, 15, 42, 16],
            writableIndexes: [18, 13, 12, 11],
          },
        ],
        header: {
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 8,
          numRequiredSignatures: 1,
        },
        instructions: [],
        recentBlockhash: 'FN4BriKgvHGgyzrz1iZ1rv2zfAvogZ9fFbKiwL8b9Eru',
      },
      signatures: [USDC_TO_SOL_SWAP_SIGNATURE],
    },
    version: 0,
  },
} as const;

const extractSignatureFromBase64Tx = (base64Tx: string): string => {
  const buffer = Buffer.from(base64Tx, 'base64');
  if (buffer.length < 65) {
    throw new Error('Invalid serialized Solana transaction');
  }
  return base58.encode(buffer.subarray(1, 65));
};

const buildSuccessfulTransactionResponse = (
  signature: string,
  scenario: 'sol-to-usdc' | 'usdc-to-sol',
) => {
  const template =
    scenario === 'sol-to-usdc'
      ? SOL_USDC_TRANSACTION_RESPONSE
      : USDC_SOL_TRANSACTION_RESPONSE;
  const response = JSON.parse(JSON.stringify(template));
  response.result.transaction.signatures = [signature];
  return response;
};

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

    const solanaRpcCorsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'access-control-allow-headers': '*',
    };

    const activeSwapScenario =
      scenario === 'usdc-to-sol' ? 'usdc-to-sol' : 'sol-to-usdc';
    const signatureHolder = {
      value:
        activeSwapScenario === 'usdc-to-sol'
          ? USDC_TO_SOL_SWAP_SIGNATURE
          : SOL_TO_USDC_SWAP_SIGNATURE,
    };

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

        // eslint-disable-next-line no-console
        console.log(
          `[SOLANA_RPC_MOCK] ${requestMethod ?? 'unknown'} (id: ${id})`,
        );

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
            try {
              const params =
                typeof requestBody === 'object' &&
                requestBody !== null &&
                'params' in requestBody &&
                Array.isArray((requestBody as { params?: unknown[] }).params)
                  ? (requestBody as { params: unknown[] }).params
                  : [];
              const serializedTx =
                typeof params[0] === 'string' ? params[0] : '';
              if (serializedTx) {
                signatureHolder.value =
                  extractSignatureFromBase64Tx(serializedTx);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log(
                '[SOLANA_RPC_MOCK] Failed to extract transaction signature',
                error,
              );
            }

            // eslint-disable-next-line no-console
            console.log(
              `[SOLANA_RPC_MOCK] ✅ Transaction submitted with signature ${signatureHolder.value}`,
            );
            rpcResponse = buildJsonRpcResponse(signatureHolder.value, id);
            break;
          case 'getSignaturesForAddress':
            rpcResponse = buildJsonRpcResponse(
              [
                {
                  blockTime: 1748363309,
                  confirmationStatus: 'finalized',
                  err: null,
                  memo: null,
                  signature: signatureHolder.value,
                  slot: 342840492,
                },
              ],
              id,
            );
            break;
          case 'getTransaction':
            rpcResponse = buildSuccessfulTransactionResponse(
              signatureHolder.value,
              activeSwapScenario,
            );
            break;
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
            );
            break;
          case 'getAccountInfo':
            {
              const params =
                typeof requestBody === 'object' &&
                requestBody !== null &&
                'params' in requestBody &&
                Array.isArray((requestBody as { params?: unknown[] }).params)
                  ? (requestBody as { params: unknown[] }).params
                  : [];
              const accountAddress =
                typeof params[0] === 'string' ? params[0] : undefined;

              const mintDataMap: Record<string, string> = {
                // USDC mint
                EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:
                  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKByThgJAAAGAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
                // WSOL mint
                So11111111111111111111111111111111111111112:
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//9jp7O24A0JAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
              };
              const mintData = accountAddress
                ? mintDataMap[accountAddress]
                : undefined;

              rpcResponse = buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.0.21', slot: 317161313 },
                  value: mintData
                    ? {
                        data: [mintData, 'base64'],
                        executable: false,
                        lamports: 5312114,
                        owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                        rentEpoch: '18446744073709551615',
                        space: 82,
                      }
                    : {
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
            }
            break;
          case 'getMultipleAccounts':
            {
              const numAltAddresses = 247;
              const dummyAddresses: string[] = [];
              for (let i = 0; i < numAltAddresses; i++) {
                const bytes = Buffer.alloc(32);
                bytes[0] = (i + 1) % 256;
                bytes[1] = Math.floor((i + 1) / 256) % 256;
                bytes[31] = 1;
                dummyAddresses.push(bytes.toString('base64'));
              }

              const params =
                typeof requestBody === 'object' &&
                requestBody !== null &&
                'params' in requestBody &&
                Array.isArray((requestBody as { params?: unknown[] }).params)
                  ? (requestBody as { params: unknown[] }).params
                  : [];
              const requestedAccounts =
                Array.isArray(params[0]) &&
                params[0].every((v) => typeof v === 'string')
                  ? (params[0] as string[])
                  : [];

              const altAccountEntry = {
                data: {
                  parsed: {
                    info: {
                      addresses: dummyAddresses,
                      authority: '9RAufBfjGQjDfrwxeyKmZWPADHSb8HcoqCdrmpqvCr1g',
                      deactivationSlot: '18446744073709551615',
                      lastExtendedSlot: '330440295',
                      lastExtendedSlotStartIndex: 0,
                    },
                    type: 'lookupTable',
                  },
                  program: 'address-lookup-table',
                  space: 56 + numAltAddresses * 32,
                },
                executable: false,
                lamports: 58296960,
                owner: 'AddressLookupTab1e1111111111111111111111111',
                rentEpoch: '18446744073709551615',
                space: 56 + numAltAddresses * 32,
              };

              rpcResponse = buildJsonRpcResponse(
                {
                  context: { apiVersion: '2.1.21', slot: 341693911 },
                  value: requestedAccounts.map(() => altAccountEntry),
                },
                id,
              );
            }
            break;
          default:
            rpcResponse = buildJsonRpcResponse(null, id);
            break;
        }

        return {
          statusCode: 200,
          headers: solanaRpcCorsHeaders,
          json: rpcResponse,
        };
      });
  };
