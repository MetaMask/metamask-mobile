import { parseGetLimitOrderResponse } from './validators';

const ASSET = {
  assetId: 'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603',
  symbol: 'USDC',
  decimals: 6,
};

const MINIMAL_RESPONSE = {
  order: {
    id: '2421deda-7395-4ec9-82b8-3384aa7320e4',
    clientOrderId: '2b810d09-b372-430b-b2b7-8d9576c30e75',
    account: 'eip155:143:0x4751fd55e5b9723f427cf1a298f785ec2adcf123',
    src: { asset: ASSET, amount: '1000000' },
    dest: { asset: ASSET, amount: '1000000' },
    trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
    state: 'OPEN',
    timingData: {
      createdAt: '2026-09-03T11:02:13.000Z',
      expiresAt: '2026-09-10T15:27:54.000Z',
    },
  },
};

const BASE_USDC = {
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  chainId: 8453,
  assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
  coingeckoId: 'usd-coin',
  aggregators: ['uniswapLabs', 'liFi', 'oneInch'],
  occurrences: 8,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
  metadata: { storage: { balance: 9, approval: 10 } },
};

const BASE_ETH = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 8453,
  assetId: 'eip155:8453/slip44:60',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ether',
  coingeckoId: 'ethereum',
  aggregators: [],
  occurrences: 100,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/60.png',
  metadata: {},
};

// A filled USDC to ETH order on Base, as the API returned it.
const FILLED_RESPONSE = {
  order: {
    id: '29770788-937e-45a6-8a37-5cf9bcd212a3',
    clientOrderId: '01e10fd2-55d6-4496-9f46-da48b5188a39',
    profileId: 'f830153c-b5dc-4506-82c2-09d7eee86bbe',
    account: 'eip155:8453:0x9e130cb31632e47be6272e453caabed9a68cdb88',
    src: { asset: BASE_USDC, amount: '9911848' },
    dest: {
      asset: BASE_ETH,
      amount: '3528061995609232',
      minAmount: '3528061995609232',
    },
    trigger: { kind: 'ratio', threshold: 'below', price: '2729.151856' },
    state: 'FILLED',
    timingData: {
      createdAt: '2026-09-30T13:20:22.880Z',
      expiresAt: '2026-09-30T14:20:22.000Z',
      closedAt: '2026-09-30T13:22:05.715Z',
    },
    isCancellable: false,
  },
  transactions: [
    {
      status: 'executed',
      txHash:
        '0x46509f06b6985ce5d0a88c8ab9cb8dcbbb0bf2f32d329f5f03e8774b841f07a3',
      quoteId: '45b8ce69-a207-40c6-9ac6-259cfd157d7f',
      src: { asset: BASE_USDC, amount: '9911848' },
      dest: { asset: BASE_ETH, amount: '3570399831060142' },
      timingData: {
        createdAt: '2026-09-30T13:21:55.901Z',
        expiresAt: '2026-09-30T14:20:22.000Z',
        closedAt: '2026-09-30T13:22:05.715Z',
      },
      feeData: {
        txFee: {
          usd: '0.09351162962297646',
          asset: BASE_ETH,
          amount: '34213562489209',
          maxFeePerGas: '26702076',
          maxPriorityFeePerGas: '1000004',
        },
        metabridge: {
          usd: '0.08696627586237457',
          asset: BASE_ETH,
          amount: '31818781531961',
          recipient: '0xe3478b0bb1a5084567c319096437924948be1964',
          baseBpsFee: 87.5,
          quoteBpsFee: 87.5,
          discountType: null,
        },
      },
    },
  ],
};

describe('parseGetLimitOrderResponse', () => {
  it('accepts a response carrying only the required fields', () => {
    expect(parseGetLimitOrderResponse(MINIMAL_RESPONSE)).toStrictEqual(
      MINIMAL_RESPONSE,
    );
  });

  it('accepts a filled order along with its fill and fees', () => {
    expect(parseGetLimitOrderResponse(FILLED_RESPONSE)).toStrictEqual(
      FILLED_RESPONSE,
    );
  });

  it('accepts order states and failure reasons it has not seen before', () => {
    const response = {
      order: {
        ...MINIMAL_RESPONSE.order,
        state: 'SOME_NEW_STATE',
        failureReason: 'SOME_NEW_REASON',
      },
      transactions: [],
    };

    expect(parseGetLimitOrderResponse(response)).toStrictEqual(response);
  });

  it('rejects an order without an expiry, which every booked order has', () => {
    expect(() =>
      parseGetLimitOrderResponse({
        order: {
          ...MINIMAL_RESPONSE.order,
          timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
        },
      }),
    ).toThrow(/Invalid limit order response/u);
  });

  it('rejects a response without the order', () => {
    expect(() => parseGetLimitOrderResponse({ transactions: [] })).toThrow(
      /Invalid limit order response/u,
    );
  });

  it('rejects a transaction hash that is not hex', () => {
    expect(() =>
      parseGetLimitOrderResponse({
        ...MINIMAL_RESPONSE,
        transactions: [
          {
            status: 'executed',
            txHash: 'not-hex',
            src: { asset: ASSET, amount: '1' },
            dest: { asset: ASSET, amount: '1' },
            timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
          },
        ],
      }),
    ).toThrow(/Invalid limit order response/u);
  });

  it('rethrows a non-validation error', () => {
    // A getter that throws is not a StructError, so it must propagate as-is.
    expect(() =>
      parseGetLimitOrderResponse({
        get order() {
          throw new RangeError('boom');
        },
      }),
    ).toThrow(RangeError);
  });
});
