import { Mockttp } from 'mockttp';
import { USDC_MAINNET, MUSD_MAINNET } from '../../constants/musd-mainnet';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../framework/fixtures/FixtureBuilder';

export const RELAY_QUOTE_MOCK = {
  steps: [
    {
      id: 'deposit',
      action: 'Confirm transaction in your wallet',
      description:
        'Depositing funds to the relayer to execute the swap for USDC.e',
      kind: 'transaction',
      items: [
        {
          status: 'incomplete',
          data: {
            from: DEFAULT_FIXTURE_ACCOUNT,
            to: '0x00000000aa467eba42a3d604b3d74d63b2b6c6cb',
            data: '0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
            value: '429579670170726',
            chainId: 59144,
            gas: '43626',
            maxFeePerGas: '67699627',
            maxPriorityFeePerGas: '67699618',
          },
          check: {
            endpoint:
              '/intents/status?requestId=0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
            method: 'GET',
          },
        },
      ],
      requestId:
        '0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
      depositAddress: '',
    },
  ],
  fees: {
    gas: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '2271931782493',
      amountFormatted: '0.000002271931782493',
      amountUsd: '0.006691',
      minimumAmount: '2271931782493',
    },
    relayer: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '11066796286303',
      amountFormatted: '0.000011066796286303',
      amountUsd: '0.032592',
      minimumAmount: '11066796286303',
    },
    relayerGas: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '2062086926533',
      amountFormatted: '0.000002062086926533',
      amountUsd: '0.006073',
      minimumAmount: '2062086926533',
    },
    relayerService: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '9004709359770',
      amountFormatted: '0.00000900470935977',
      amountUsd: '0.026519',
      minimumAmount: '9004709359770',
    },
    app: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0',
      minimumAmount: '0',
    },
    subsidized: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0',
      minimumAmount: '0',
    },
  },
  details: {
    operation: 'swap',
    sender: DEFAULT_FIXTURE_ACCOUNT,
    recipient: '0x8f781b47e4a377dba9547cdcd00df98c7064a5b2',
    currencyIn: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '429579670170726',
      amountFormatted: '0.000429579670170726',
      amountUsd: '1.265112',
      minimumAmount: '429579670170726',
    },
    currencyOut: {
      currency: {
        chainId: 137,
        address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        symbol: 'USDC.e',
        name: 'USDCoin (bridged)',
        decimals: 6,
        metadata: {
          logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
          verified: true,
        },
      },
      amount: '1230000',
      amountFormatted: '1.23',
      amountUsd: '1.229758',
      minimumAmount: '1223660',
    },
    refundCurrency: {
      currency: {
        chainId: 59144,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
        },
      },
      amount: '429579670170726',
      amountFormatted: '0.000429579670170726',
      amountUsd: '1.265112',
      minimumAmount: '429579670170726',
    },
    totalImpact: {
      usd: '-0.035354',
      percent: '-2.79',
    },
    swapImpact: {
      usd: '-0.003009',
      percent: '-0.24',
    },
    expandedPriceImpact: {
      swap: {
        usd: '-0.003623',
      },
      execution: {
        usd: '-0.026073',
      },
      relay: {
        usd: '-0.005905',
      },
      app: {
        usd: '0',
      },
    },
    rate: '2862.6890083305493',
    slippageTolerance: {
      origin: {
        usd: '0.000000',
        value: '0',
        percent: '0.00',
      },
      destination: {
        usd: '0.006272',
        value: '6340',
        percent: '0.51',
      },
    },
    timeEstimate: 4,
    userBalance: '0',
    isFixedRate: false,
    route: {
      origin: {
        inputCurrency: {
          currency: {
            chainId: 59144,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
            metadata: {
              logoURI: 'https://assets.relay.link/icons/1/light.png',
              verified: true,
            },
          },
          amount: '429579670170726',
          amountFormatted: '0.000429579670170726',
          amountUsd: '1.265112',
          minimumAmount: '429579670170726',
        },
        outputCurrency: {
          currency: {
            chainId: 59144,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
            metadata: {
              logoURI: 'https://assets.relay.link/icons/1/light.png',
              verified: true,
            },
          },
          amount: '429579670170726',
          amountFormatted: '0.000429579670170726',
          amountUsd: '1.265112',
          minimumAmount: '429579670170726',
        },
        router: 'relay',
      },
      destination: {
        inputCurrency: {
          currency: {
            chainId: 137,
            address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            metadata: {
              logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
              verified: true,
            },
          },
          amount: '1229919',
          amountFormatted: '1.229919',
          amountUsd: '1.229677',
          minimumAmount: '1229919',
        },
        outputCurrency: {
          currency: {
            chainId: 137,
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            symbol: 'USDC.e',
            name: 'USDCoin (bridged)',
            decimals: 6,
            metadata: {
              logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png',
              verified: true,
            },
          },
          amount: '1230000',
          amountFormatted: '1.23',
          amountUsd: '1.229758',
          minimumAmount: '1223660',
        },
        router: '0x',
      },
    },
  },
};

/**
 * Relay quote mock for Mainnet mUSD conversion (chainId 1, USDC → mUSD).
 * TransactionPayController's normalizeQuote expects:
 * - details.currencyIn/currencyOut with chainId matching the request (1)
 * - steps[].items[].data.chainId = 1 so gas/network lookups use Mainnet
 * - details.timeEstimate, details.totalImpact.usd
 */
export const MAINNET_MUSD_RELAY_QUOTE_MOCK = {
  steps: [
    {
      id: 'deposit',
      action: 'Confirm transaction in your wallet',
      description: 'Convert USDC to mUSD',
      kind: 'transaction',
      items: [
        {
          status: 'incomplete',
          data: {
            from: DEFAULT_FIXTURE_ACCOUNT,
            to: '0x00000000aa467eba42a3d604b3d74d63b2b6c6cb',
            data: '0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
            value: '0',
            chainId: 1,
            gas: '100000',
            maxFeePerGas: '30000000000',
            maxPriorityFeePerGas: '1000000000',
          },
          check: {
            endpoint:
              '/intents/status?requestId=0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
            method: 'GET',
          },
        },
      ],
      requestId:
        '0x470b5f3b22544142d6b2116ec296913046fe06578b495e602ac2fe0c87b843de',
      depositAddress: '',
    },
  ],
  details: {
    operation: 'swap',
    sender: DEFAULT_FIXTURE_ACCOUNT,
    recipient: DEFAULT_FIXTURE_ACCOUNT,
    currencyIn: {
      currency: {
        chainId: 1,
        address: USDC_MAINNET,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        metadata: { logoURI: '', verified: true },
      },
      amount: '100000000',
      amountFormatted: '100',
      amountUsd: '100',
      minimumAmount: '100000000',
    },
    currencyOut: {
      currency: {
        chainId: 1,
        address: MUSD_MAINNET,
        symbol: 'MUSD',
        name: 'MetaMask USD',
        decimals: 6,
        metadata: { logoURI: '', verified: true },
      },
      amount: '100100000',
      amountFormatted: '100.1',
      amountUsd: '100.1',
      minimumAmount: '100000000',
    },
    totalImpact: { usd: '-0.01', percent: '-0.01' },
    timeEstimate: 4,
  },
  fees: {
    relayer: { amountUsd: '0.01' },
  },
  metamask: { gasLimits: [100000] },
};

export const RELAY_STATUS_MOCK = {
  status: 'success',
  txHashes: [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  ],
};

export async function mockRelayQuote(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('api.relay.link/quote'));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: RELAY_QUOTE_MOCK,
    }));
}

/**
 * Mocks Relay quote API for Mainnet mUSD conversion (chainId 1, USDC → mUSD).
 * Use this in mUSD conversion E2E so normalizeQuote uses Mainnet for gas/rates.
 */
export async function mockRelayQuoteMainnetMusd(mockServer: Mockttp) {
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('api.relay.link/quote'));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: MAINNET_MUSD_RELAY_QUOTE_MOCK,
    }));
}

export async function mockRelayStatus(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url');
      return Boolean(url?.includes('api.relay.link/intents/status'));
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: RELAY_STATUS_MOCK,
    }));
}
