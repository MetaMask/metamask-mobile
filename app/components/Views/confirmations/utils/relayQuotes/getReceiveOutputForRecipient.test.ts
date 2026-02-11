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
}: {
  recipient?: string;
  amountFormatted?: string;
  amount?: string;
  decimals?: number;
  symbol?: string;
} = {}) =>
  ({
    strategy: TransactionPayStrategy.Relay,
    original: {
      quote: {
        details: {
          recipient,
          currencyOut: {
            currency: {
              address: '0xToken',
              symbol,
              decimals,
            },
            amountFormatted,
            amount,
          },
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
});

