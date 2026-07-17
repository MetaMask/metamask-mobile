import { oldestRawActivityTime, parseAccountsApiActivity } from './accountsApi';

const MONEY_ADDRESS = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';
const SETTLEMENT_ADDRESS = '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e';
const REWARDER_ADDRESS = '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0';
const CASHBACK_MULTISEND_TO = '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb';

const cardPaymentRow = {
  hash: '0x2b45bda071d8feff265c541e251a5e035e5f55270f8ad288dcd80f6740793847',
  timestamp: '2026-06-04T11:53:51.000Z',
  chainId: 143,
  from: '0x1905d0a43340c81b94468e7dfa5f341ff47ae6a5',
  to: '0x40a695a16c213afef1c87fd471fb73157b948f3f',
  isError: false,
  transactionType: 'METAMASK_CARD_PAYMENT',
  valueTransfers: [
    {
      from: MONEY_ADDRESS.toLowerCase(),
      to: SETTLEMENT_ADDRESS.toLowerCase(),
      amount: '5381986',
      decimal: 6,
      contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      symbol: 'mUSD',
    },
  ],
};

const cashbackRow = {
  hash: '0x9c3aa0a1f1f4a8c2d3e4f5061728394a5b6c7d8e9f00112233445566778899aa',
  timestamp: '2026-06-04T12:10:00.000Z',
  chainId: 143,
  from: REWARDER_ADDRESS,
  to: MONEY_ADDRESS.toLowerCase(),
  isError: false,
  transactionType: 'METAMASK_CARD_CASHBACK',
  valueTransfers: [
    {
      from: REWARDER_ADDRESS,
      to: MONEY_ADDRESS.toLowerCase(),
      amount: '300000',
      decimal: 6,
      contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      symbol: 'mUSD',
    },
  ],
};

/** Unclassified Accounts API row — Baanx multisend mUSD payout on Monad. */
const unclassifiedCashbackRow = {
  hash: '0x126be466696f2e3d124c97dedd7a6abd02e31883f544e92f80de732d566b9b16',
  timestamp: '2026-06-22T21:41:12.000Z',
  chainId: 143,
  from: '0xb978703B01a60c7fbD4541D6c29299C65C8e61EA',
  to: CASHBACK_MULTISEND_TO,
  isError: false,
  methodId: '0x0d49b711',
  transactionType: 'GENERIC_CONTRACT_CALL',
  valueTransfers: [
    {
      from: '0x21607d4c8cf71844955889890c1711655fd08d72',
      to: MONEY_ADDRESS.toLowerCase(),
      amount: '999454',
      decimal: 6,
      contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      symbol: 'mUSD',
    },
  ],
};

const inboundTopUpRow = {
  hash: '0x1219eae581c3f3ff44cace3ec51b91c31fa15aecbff612d8bcd058128990e710',
  timestamp: '2026-06-04T11:42:02.000Z',
  chainId: 143,
  from: '0xb42f812a44c22cc6b861478900401ee759ebead6',
  to: '0xdb9b1e94b5b69df7e401ddbede43491141047db3',
  isError: false,
  transactionType: 'GENERIC_CONTRACT_CALL',
  valueTransfers: [
    {
      from: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0',
      to: MONEY_ADDRESS.toLowerCase(),
      amount: '9910542',
      decimal: 6,
      contractAddress: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
      symbol: 'USDC',
    },
  ],
};

describe('parseAccountsApiActivity', () => {
  it('maps a card payment to a card outflow keyed on the leg leaving the money account', () => {
    // Arrange — a card payment alongside an unrelated top-up.
    const response = { data: [cardPaymentRow, inboundTopUpRow] };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([
      {
        kind: 'card',
        hash: cardPaymentRow.hash,
        time: Date.parse('2026-06-04T11:53:51.000Z'),
        chainId: '0x8f',
        token: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '5381986',
        paidTo: SETTLEMENT_ADDRESS.toLowerCase(),
      },
    ]);
  });

  it('maps a cashback row to a cashback inflow keyed on the leg crediting the money account', () => {
    // Arrange
    const response = { data: [cashbackRow, inboundTopUpRow] };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([
      {
        kind: 'cashback',
        hash: cashbackRow.hash,
        time: Date.parse('2026-06-04T12:10:00.000Z'),
        chainId: '0x8f',
        token: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '300000',
        receivedFrom: REWARDER_ADDRESS,
      },
    ]);
  });

  it('parses card and cashback rows from the same response, in input order', () => {
    // Arrange
    const response = { data: [cardPaymentRow, cashbackRow] };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result.map((a) => a.kind)).toEqual(['card', 'cashback']);
  });

  it('selects the value transfer for the correct direction when legs are mixed', () => {
    // Arrange — card payment with the settlement leg listed second.
    const response = {
      data: [
        {
          ...cardPaymentRow,
          valueTransfers: [
            {
              from: '0x0000000000000000000000000000000000000000',
              to: MONEY_ADDRESS.toLowerCase(),
              amount: '1',
              decimal: 6,
              contractAddress: '0xaaa',
              symbol: 'OTHER',
            },
            cardPaymentRow.valueTransfers[0],
          ],
        },
      ],
    };

    // Act
    const [card] = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(card.amount).toBe('5381986');
    expect(card.token.symbol).toBe('mUSD');
  });

  it('drops malformed rows (missing transfer or bad timestamp) without throwing', () => {
    // Arrange
    const response = {
      data: [
        { ...cardPaymentRow, valueTransfers: [] },
        { ...cashbackRow, timestamp: 'not-a-date' },
      ],
    };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it('maps an unclassified Baanx multisend payout to cashback when it credits the money account', () => {
    // Arrange — Accounts API has not yet tagged the row as METAMASK_CARD_CASHBACK.
    const response = { data: [unclassifiedCashbackRow, inboundTopUpRow] };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([
      {
        kind: 'cashback',
        hash: unclassifiedCashbackRow.hash,
        time: Date.parse('2026-06-22T21:41:12.000Z'),
        chainId: '0x8f',
        token: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '999454',
        receivedFrom: '0x21607d4c8cf71844955889890c1711655fd08d72',
      },
    ]);
  });

  it('ignores unclassified multisend rows that do not match the cashback heuristics', () => {
    expect(
      parseAccountsApiActivity(
        {
          data: [
            {
              ...unclassifiedCashbackRow,
              to: '0x0000000000000000000000000000000000000001',
            },
            {
              ...unclassifiedCashbackRow,
              methodId: '0xdeadbeef',
            },
          ],
        },
        MONEY_ADDRESS,
      ),
    ).toEqual([]);
  });

  it('ignores multisend rows where the money account inbound credit is not mUSD', () => {
    expect(
      parseAccountsApiActivity(
        {
          data: [
            {
              ...unclassifiedCashbackRow,
              valueTransfers: [
                {
                  from: '0x21607d4c8cf71844955889890c1711655fd08d72',
                  to: MONEY_ADDRESS.toLowerCase(),
                  amount: '1000000',
                  decimal: 6,
                  contractAddress: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
                  symbol: 'USDC',
                },
                {
                  from: '0x0000000000000000000000000000000000000000',
                  to: '0x0000000000000000000000000000000000000001',
                  amount: '999454',
                  decimal: 6,
                  contractAddress: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
                  symbol: 'mUSD',
                },
              ],
            },
          ],
        },
        MONEY_ADDRESS,
      ),
    ).toEqual([]);
  });

  it('selects the mUSD inbound leg when multiple inbound transfers credit the money account', () => {
    const response = {
      data: [
        {
          ...unclassifiedCashbackRow,
          valueTransfers: [
            {
              from: '0x0000000000000000000000000000000000000000',
              to: MONEY_ADDRESS.toLowerCase(),
              amount: '1',
              decimal: 6,
              contractAddress: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
              symbol: 'USDC',
            },
            unclassifiedCashbackRow.valueTransfers[0],
          ],
        },
      ],
    };

    const [cashback] = parseAccountsApiActivity(response, MONEY_ADDRESS);

    expect(cashback.amount).toBe('999454');
    expect(cashback.token.symbol).toBe('mUSD');
  });

  it('uses the provided cashback multisend contract list instead of defaults', () => {
    const customContract = '0x00000000000000000000000000000000000000aa';

    expect(
      parseAccountsApiActivity(
        { data: [unclassifiedCashbackRow] },
        MONEY_ADDRESS,
        [customContract],
      ),
    ).toEqual([]);

    expect(
      parseAccountsApiActivity(
        {
          data: [
            {
              ...unclassifiedCashbackRow,
              to: customContract,
            },
          ],
        },
        MONEY_ADDRESS,
        [customContract],
      ),
    ).toEqual([
      expect.objectContaining({
        kind: 'cashback',
        hash: unclassifiedCashbackRow.hash,
      }),
    ]);
  });

  it('ignores rows of other transaction types', () => {
    expect(
      parseAccountsApiActivity({ data: [inboundTopUpRow] }, MONEY_ADDRESS),
    ).toEqual([]);
  });

  it('returns an empty array when there is no data', () => {
    expect(parseAccountsApiActivity({}, MONEY_ADDRESS)).toEqual([]);
  });

  it('maps a card payment with an inbound mUSD leg to a refund (a reversed spend)', () => {
    // Arrange — mUSD moves back TO the money account; a spend was refunded.
    const response = {
      data: [
        {
          ...cardPaymentRow,
          valueTransfers: [
            {
              ...cardPaymentRow.valueTransfers[0],
              from: SETTLEMENT_ADDRESS.toLowerCase(),
              to: MONEY_ADDRESS.toLowerCase(),
            },
          ],
        },
      ],
    };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([
      {
        kind: 'refund',
        hash: cardPaymentRow.hash,
        time: Date.parse('2026-06-04T11:53:51.000Z'),
        chainId: '0x8f',
        token: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '5381986',
        receivedFrom: SETTLEMENT_ADDRESS.toLowerCase(),
      },
    ]);
  });

  it('drops a card payment whose inbound refund leg is not mUSD', () => {
    // Arrange — inbound credit, but in a non-mUSD token: not a refund we surface.
    const response = {
      data: [
        {
          ...cardPaymentRow,
          valueTransfers: [
            {
              ...cardPaymentRow.valueTransfers[0],
              from: SETTLEMENT_ADDRESS.toLowerCase(),
              to: MONEY_ADDRESS.toLowerCase(),
              contractAddress: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
              symbol: 'USDC',
            },
          ],
        },
      ],
    };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it('drops a cashback row with no leg crediting the money account', () => {
    // Arrange — funds leave the money account; not a credit.
    const response = {
      data: [
        {
          ...cashbackRow,
          valueTransfers: [
            {
              ...cashbackRow.valueTransfers[0],
              from: MONEY_ADDRESS.toLowerCase(),
              to: REWARDER_ADDRESS,
            },
          ],
        },
      ],
    };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it('drops rows whose chainId is not an accepted (Monad) chain', () => {
    // Arrange — card + cashback indexed on some other chain.
    const response = {
      data: [
        { ...cardPaymentRow, chainId: 1 },
        { ...cashbackRow, chainId: 1 },
      ],
    };

    // Act
    const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it.each([
    ['decimal missing', { decimal: undefined }],
    ['decimal negative', { decimal: -1 }],
    ['decimal not an integer', { decimal: 6.5 }],
    ['amount non-numeric', { amount: '5.38' }],
    ['amount empty', { amount: '' }],
    ['amount not a string', { amount: 5381986 }],
  ])(
    'drops a row with an untrustworthy settlement leg (%s)',
    (_label, override) => {
      // Arrange — a wire value that would otherwise render a wrong/NaN amount.
      // Cast through `unknown`: these payloads deliberately violate the wire
      // types to simulate untrustworthy JSON.
      const response = {
        data: [
          {
            ...cardPaymentRow,
            valueTransfers: [
              { ...cardPaymentRow.valueTransfers[0], ...override },
            ],
          },
        ],
      } as unknown as Parameters<typeof parseAccountsApiActivity>[0];

      // Act
      const result = parseAccountsApiActivity(response, MONEY_ADDRESS);

      // Assert
      expect(result).toEqual([]);
    },
  );
});

describe('oldestRawActivityTime', () => {
  const page = (...timestamps: string[]) => ({
    data: timestamps.map((timestamp) => ({ timestamp })),
  });

  it('returns +Infinity when no pages have been fetched', () => {
    expect(oldestRawActivityTime([])).toBe(Number.POSITIVE_INFINITY);
  });

  it('returns +Infinity when fetched pages carry no rows', () => {
    expect(oldestRawActivityTime([{ data: [] }, {}])).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('returns the oldest raw timestamp across every page', () => {
    const oldest = '2026-06-01T00:00:00.000Z';
    const result = oldestRawActivityTime([
      page('2026-06-04T00:00:00.000Z', '2026-06-03T00:00:00.000Z'),
      page(oldest, '2026-06-02T00:00:00.000Z'),
    ]);

    expect(result).toBe(new Date(oldest).getTime());
  });

  it('ignores rows with an unparseable timestamp', () => {
    const valid = '2026-06-02T00:00:00.000Z';
    const result = oldestRawActivityTime([page('not-a-date', valid)]);

    expect(result).toBe(new Date(valid).getTime());
  });
});
