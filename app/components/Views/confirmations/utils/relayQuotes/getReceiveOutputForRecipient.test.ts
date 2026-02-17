import {
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import { getReceiveOutputForRecipient } from './getReceiveOutputForRecipient';

const RECIPIENT_ADDRESS = '0xabcDEF0000000000000000000000000000000000';

const createRelayQuote = ({
  recipient = RECIPIENT_ADDRESS,
  amountFormatted = '1.23',
  amount,
  decimals = 6,
  symbol = 'MUSD',
  strategy = TransactionPayStrategy.Relay,
  originalDetails,
  currencyAddress,
}: {
  recipient?: string;
  amountFormatted?: string;
  amount?: string;
  decimals?: number;
  symbol?: string;
  strategy?: TransactionPayStrategy;
  originalDetails?: Record<string, unknown>;
  currencyAddress?: string;
} = {}) =>
  ({
    strategy,
    original: originalDetails ?? {
      details: {
        recipient,
        currencyOut: {
          currency: {
            address: currencyAddress ?? '0xToken',
            symbol,
            decimals,
          },
          amountFormatted,
          amount,
        },
      },
    },
  }) as unknown as TransactionPayQuote<Json>;

describe('getReceiveOutputForRecipient', () => {
  it('returns undefined when recipientAddress is missing', () => {
    const quotes = [createRelayQuote()];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns output when quote recipient matches recipientAddress (case-insensitive)', () => {
    const quotes = [
      createRelayQuote({
        recipient: RECIPIENT_ADDRESS.toLowerCase(),
        amountFormatted: '100.1',
        symbol: 'MUSD',
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toStrictEqual(
      expect.objectContaining({
        amount: '100.1',
        symbol: 'MUSD',
      }),
    );
  });

  it('returns undefined when no Relay quote recipient matches recipientAddress', () => {
    const quotes = [
      createRelayQuote({
        recipient: '0x0000000000000000000000000000000000000001',
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('formats amount from raw amount when amountFormatted is missing', () => {
    const quotes = [
      createRelayQuote({
        amountFormatted: '',
        amount: '100100000',
        decimals: 6,
        symbol: 'MUSD',
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toStrictEqual(
      expect.objectContaining({
        amount: '100.1',
        symbol: 'MUSD',
      }),
    );
  });

  it('returns undefined when quotes is undefined', () => {
    const result = getReceiveOutputForRecipient({
      quotes: undefined,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when quotes is empty array', () => {
    const result = getReceiveOutputForRecipient({
      quotes: [],
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote with non-Relay strategy', () => {
    const quotes = [
      createRelayQuote({ strategy: TransactionPayStrategy.Bridge }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote when original has no details', () => {
    const quotes = [createRelayQuote({ originalDetails: {} })];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote when symbol is missing', () => {
    const quotes = [
      createRelayQuote({
        originalDetails: {
          details: {
            recipient: RECIPIENT_ADDRESS,
            currencyOut: {
              currency: {
                address: '0xToken',
                decimals: 6,
              },
              amountFormatted: '1.23',
            },
          },
        },
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote when symbol is empty string', () => {
    const quotes = [createRelayQuote({ symbol: '' })];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote when amountFormatted and rawAmount are both empty', () => {
    const quotes = [
      createRelayQuote({
        amountFormatted: '',
        amount: '',
        decimals: 6,
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('skips quote when amountFormatted is empty and decimals is not a number', () => {
    const quotes = [
      createRelayQuote({
        originalDetails: {
          details: {
            recipient: RECIPIENT_ADDRESS,
            currencyOut: {
              currency: {
                address: '0xToken',
                symbol: 'MUSD',
                decimals: undefined,
              },
              amountFormatted: '',
              amount: '100100000',
            },
          },
        },
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toBeUndefined();
  });

  it('returns tokenAddress and decimals when present in currencyOut', () => {
    const quotes = [
      createRelayQuote({
        amountFormatted: '50.5',
        currencyAddress: '0xCustomToken123',
        decimals: 18,
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toStrictEqual({
      amount: '50.5',
      symbol: 'MUSD',
      tokenAddress: '0xCustomToken123',
      decimals: 18,
    });
  });

  it('picks first matching quote when multiple Relay quotes exist', () => {
    const quotes = [
      createRelayQuote({
        recipient: RECIPIENT_ADDRESS,
        amountFormatted: '10',
        symbol: 'USDC',
      }),
      createRelayQuote({
        recipient: RECIPIENT_ADDRESS,
        amountFormatted: '20',
        symbol: 'MUSD',
      }),
    ];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result).toStrictEqual(
      expect.objectContaining({
        amount: '10',
        symbol: 'USDC',
      }),
    );
  });

  it('returns undefined when recipientAddress is empty string', () => {
    const quotes = [createRelayQuote()];

    const result = getReceiveOutputForRecipient({
      quotes,
      recipientAddress: '',
    });

    expect(result).toBeUndefined();
  });
});
