import { parseCardTransactions } from './accountsApi';

const MONEY_ADDRESS = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';
const SETTLEMENT_ADDRESS = '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e';

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

describe('parseCardTransactions', () => {
  it('keeps only METAMASK_CARD_PAYMENT rows and maps the settlement leg', () => {
    // Arrange
    const response = { data: [cardPaymentRow, inboundTopUpRow] };

    // Act
    const result = parseCardTransactions(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([
      {
        hash: cardPaymentRow.hash,
        time: Date.parse('2026-06-04T11:53:51.000Z'),
        chainId: '0x8f',
        token: {
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          decimals: 6,
        },
        amount: '5381986',
        to: SETTLEMENT_ADDRESS.toLowerCase(),
      },
    ]);
  });

  it('selects the value transfer leaving the money account', () => {
    // Arrange — settlement leg listed second, an unrelated leg first.
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
    const [card] = parseCardTransactions(response, MONEY_ADDRESS);

    // Assert
    expect(card.amount).toBe('5381986');
    expect(card.token.symbol).toBe('mUSD');
  });

  it('drops malformed rows (missing transfer or bad timestamp) without throwing', () => {
    // Arrange
    const response = {
      data: [
        { ...cardPaymentRow, valueTransfers: [] },
        { ...cardPaymentRow, timestamp: 'not-a-date' },
      ],
    };

    // Act
    const result = parseCardTransactions(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it('returns an empty array when there is no data', () => {
    expect(parseCardTransactions({}, MONEY_ADDRESS)).toEqual([]);
  });

  it('drops a card payment with no leg leaving the money account (e.g. a refund)', () => {
    // Arrange — funds move TO the money account; we only render outgoing debits.
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
    const result = parseCardTransactions(response, MONEY_ADDRESS);

    // Assert
    expect(result).toEqual([]);
  });

  it('drops rows whose chainId is not an accepted (Monad) chain', () => {
    // Arrange — a card payment indexed on some other chain the API shouldn't return.
    const response = { data: [{ ...cardPaymentRow, chainId: 1 }] };

    // Act
    const result = parseCardTransactions(response, MONEY_ADDRESS);

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
    'drops a card payment with an untrustworthy settlement leg (%s)',
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
      } as unknown as Parameters<typeof parseCardTransactions>[0];

      // Act
      const result = parseCardTransactions(response, MONEY_ADDRESS);

      // Assert
      expect(result).toEqual([]);
    },
  );
});
