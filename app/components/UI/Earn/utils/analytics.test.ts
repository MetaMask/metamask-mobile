import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayQuote } from '@metamask/transaction-pay-controller';
import { Hex, Json } from '@metamask/utils';
import {
  deepSnakeCaseKeys,
  getMusdConversionQuoteTrackingData,
} from './analytics';

describe('deepSnakeCaseKeys', () => {
  it('converts camelCase keys to snake_case', () => {
    const input = { myKey: 'value', anotherKey: 42 };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      my_key: 'value',
      another_key: 42,
    });
  });

  it('handles nested objects recursively', () => {
    const input = {
      outerKey: {
        innerKey: 'value',
        deeperLevel: {
          deepKey: true,
        },
      },
    };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      outer_key: {
        inner_key: 'value',
        deeper_level: {
          deep_key: true,
        },
      },
    });
  });

  it('handles arrays by converting each element', () => {
    const input = [{ itemKey: 1 }, { itemKey: 2 }];

    expect(deepSnakeCaseKeys(input)).toStrictEqual([
      { item_key: 1 },
      { item_key: 2 },
    ]);
  });

  it('handles arrays nested inside objects', () => {
    const input = {
      myList: [{ listItemKey: 'a' }, { listItemKey: 'b' }],
    };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      my_list: [{ list_item_key: 'a' }, { list_item_key: 'b' }],
    });
  });

  it('returns primitive values unchanged', () => {
    expect(deepSnakeCaseKeys('hello')).toBe('hello');
    expect(deepSnakeCaseKeys(42)).toBe(42);
    expect(deepSnakeCaseKeys(true)).toBe(true);
    expect(deepSnakeCaseKeys(null)).toBeNull();
    expect(deepSnakeCaseKeys(undefined)).toBeUndefined();
  });

  it('handles empty objects', () => {
    expect(deepSnakeCaseKeys({})).toStrictEqual({});
  });

  it('handles empty arrays', () => {
    expect(deepSnakeCaseKeys([])).toStrictEqual([]);
  });

  it('preserves keys already in snake_case', () => {
    const input = { already_snake: 'value' };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      already_snake: 'value',
    });
  });
});

describe('getMusdConversionQuoteTrackingData', () => {
  const SOURCE_CHAIN_ID = '0x1' as Hex;
  const TARGET_CHAIN_ID = '0xa' as Hex;
  const SOURCE_TOKEN_ADDRESS = '0xabc' as Hex;
  const TARGET_TOKEN_ADDRESS = '0xdef' as Hex;
  const TX_TO_ADDRESS = '0x999' as Hex;

  const buildQuote = (
    overrides: Partial<{
      sourceChainId: Hex;
      targetChainId: Hex;
      sourceTokenAddress: Hex;
      targetTokenAddress: Hex;
      strategy: string;
      sourceAmountUsd: string;
      targetAmountUsd: string;
    }> = {},
  ): TransactionPayQuote<Json> =>
    ({
      strategy: overrides.strategy ?? 'bridge',
      sourceAmount: { usd: overrides.sourceAmountUsd ?? '100.00' },
      targetAmount: { usd: overrides.targetAmountUsd ?? '99.50' },
      request: {
        sourceChainId: overrides.sourceChainId ?? SOURCE_CHAIN_ID,
        targetChainId: overrides.targetChainId ?? TARGET_CHAIN_ID,
        sourceTokenAddress:
          overrides.sourceTokenAddress ?? SOURCE_TOKEN_ADDRESS,
        targetTokenAddress:
          overrides.targetTokenAddress ?? TARGET_TOKEN_ADDRESS,
      },
    }) as unknown as TransactionPayQuote<Json>;

  const buildTxMeta = (
    overrides: Partial<{
      chainId: Hex;
      to: Hex;
      metamaskPayChainId: Hex;
      metamaskPayTokenAddress: Hex;
    }> = {},
  ): TransactionMeta =>
    ({
      chainId: overrides.chainId ?? TARGET_CHAIN_ID,
      txParams: {
        to: overrides.to ?? TX_TO_ADDRESS,
      },
      metamaskPay: {
        chainId: overrides.metamaskPayChainId ?? SOURCE_CHAIN_ID,
        tokenAddress: overrides.metamaskPayTokenAddress ?? SOURCE_TOKEN_ADDRESS,
      },
    }) as unknown as TransactionMeta;

  it('returns all snake_cased quote tracking properties', () => {
    const txMeta = buildTxMeta();
    const quotes = [buildQuote()];

    const result = getMusdConversionQuoteTrackingData(txMeta, quotes);

    expect(result).toStrictEqual({
      quote_payment_chain_id: SOURCE_CHAIN_ID,
      quote_output_chain_id: TARGET_CHAIN_ID,
      quote_payment_token_address: SOURCE_TOKEN_ADDRESS,
      quote_output_token_address: TARGET_TOKEN_ADDRESS,
      quote_is_same_chain: false,
      pay_quote_strategy: 'bridge',
      payment_amount_usd: '100.00',
      output_amount_usd: '99.50',
      selected_payment_chain_id: SOURCE_CHAIN_ID,
      selected_payment_chain_matches_quote_payment_chain: true,
      tx_execution_chain_matches_quote_output_chain: true,
      payment_token_address: SOURCE_TOKEN_ADDRESS,
      payment_token_chain_id: SOURCE_CHAIN_ID,
      output_token_address: TARGET_TOKEN_ADDRESS,
      output_token_chain_id: TARGET_CHAIN_ID,
    });
  });

  it('detects same-chain when source and target chain match', () => {
    const txMeta = buildTxMeta({ chainId: SOURCE_CHAIN_ID });
    const quotes = [
      buildQuote({
        sourceChainId: SOURCE_CHAIN_ID,
        targetChainId: SOURCE_CHAIN_ID,
      }),
    ];

    const result = getMusdConversionQuoteTrackingData(txMeta, quotes);

    expect(result.quote_is_same_chain).toBe(true);
  });

  it('returns "unknown" strategy when quote has no strategy', () => {
    const txMeta = buildTxMeta();
    const quote = buildQuote();
    (quote as unknown as Record<string, unknown>).strategy = undefined;

    const result = getMusdConversionQuoteTrackingData(txMeta, [quote]);

    expect(result.pay_quote_strategy).toBe('unknown');
  });

  it('lowercases the strategy string', () => {
    const txMeta = buildTxMeta();
    const quotes = [buildQuote({ strategy: 'RELAY' })];

    const result = getMusdConversionQuoteTrackingData(txMeta, quotes);

    expect(result.pay_quote_strategy).toBe('relay');
  });

  it('falls back to quote token address when metamaskPay is absent', () => {
    const txMeta = {
      chainId: TARGET_CHAIN_ID,
      txParams: { to: TX_TO_ADDRESS },
    } as unknown as TransactionMeta;
    const quotes = [buildQuote()];

    const result = getMusdConversionQuoteTrackingData(txMeta, quotes);

    expect(result.payment_token_address).toBe(SOURCE_TOKEN_ADDRESS);
    expect(result.payment_token_chain_id).toBe(SOURCE_CHAIN_ID);
  });

  // TODO: We don't want this behaviour. If the quote has no target token address, we should not use the txParams.to.
  it('falls back to txParams.to when quote has no target token address', () => {
    const txMeta = buildTxMeta();
    const quote = buildQuote();
    (
      quote as unknown as { request: Record<string, unknown> }
    ).request.targetTokenAddress = undefined;

    const result = getMusdConversionQuoteTrackingData(txMeta, [quote]);

    expect(result.output_token_address).toBe(TX_TO_ADDRESS);
  });

  it('falls back to transactionMeta.chainId when quote has no target chain', () => {
    const txMeta = buildTxMeta();
    const quote = buildQuote();
    (
      quote as unknown as { request: Record<string, unknown> }
    ).request.targetChainId = undefined;

    const result = getMusdConversionQuoteTrackingData(txMeta, [quote]);

    expect(result.output_token_chain_id).toBe(TARGET_CHAIN_ID);
  });

  it('uses the first quote when multiple quotes are provided', () => {
    const txMeta = buildTxMeta();
    const firstQuote = buildQuote({ strategy: 'bridge' });
    const secondQuote = buildQuote({ strategy: 'relay' });

    const result = getMusdConversionQuoteTrackingData(txMeta, [
      firstQuote,
      secondQuote,
    ]);

    expect(result.pay_quote_strategy).toBe('bridge');
  });
});
