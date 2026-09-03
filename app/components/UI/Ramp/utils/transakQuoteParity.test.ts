import type { TransakBuyQuote } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import {
  assertTransakQuoteParity,
  normalizeTransakPaymentMethod,
  QuoteChangedError,
} from './transakQuoteParity';

const buildAcceptedQuote = (overrides: Record<string, unknown> = {}): Quote =>
  ({
    provider: '/providers/transak-native',
    quote: {
      amountIn: 15,
      amountOut: 0.015,
      paymentMethod: '/payments/debit-credit-card',
      providerFee: 0.45,
      networkFee: 0.1,
      extraFee: 0.15,
      totalFees: 0.7,
      feeMode: {
        requested: 'fee-on-top',
        effective: 'fee-on-top',
      },
      crypto: {
        symbol: 'ETH',
        network: { shortName: 'Ethereum' },
      },
      ...overrides,
    },
  }) as Quote;

const buildNativeQuote = (
  overrides: Partial<TransakBuyQuote> = {},
): TransakBuyQuote =>
  ({
    fiatCurrency: 'USD',
    cryptoCurrency: 'ETH',
    network: 'ethereum',
    paymentMethod: 'credit_debit_card',
    fiatAmount: 15,
    cryptoAmount: 0.015,
    conversionPrice: 1000,
    totalFee: 0.7,
    feeBreakdown: [
      { id: 'transak_fee', value: 0.45 },
      { id: 'network_fee', value: 0.1 },
      { id: 'partner_fee', value: 0.15 },
    ],
    requestedAssetId: 'eip155:1/slip44:60',
    requestedChainId: 'eip155:1',
    feeMode: {
      requested: 'fee-on-top',
      effective: 'fee-on-top',
    },
    ...overrides,
  }) as TransakBuyQuote;

const EXPECTED_CONTEXT = {
  currency: 'USD',
  paymentMethod: '/payments/debit-credit-card',
};

describe('Transak quote parity', () => {
  it.each([
    ['/payments/apple-pay', 'apple_pay'],
    ['/payments/debit-credit-card', 'credit_debit_card'],
  ])('normalizes %s independently', (rampsMethod, nativeMethod) => {
    const normalizedRampsMethod = normalizeTransakPaymentMethod(rampsMethod);
    const normalizedNativeMethod = normalizeTransakPaymentMethod(nativeMethod);

    expect(normalizedRampsMethod).toBe(normalizedNativeMethod);
  });

  it('accepts cent-equivalent quote values', () => {
    const accepted = buildAcceptedQuote();
    const native = buildNativeQuote({ fiatAmount: 15.004 });

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).not.toThrow();
  });

  it('rejects post-auth repricing with QUOTE_CHANGED', () => {
    const accepted = buildAcceptedQuote();
    const native = buildNativeQuote({ totalFee: 3.51 });

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).toThrow(
      expect.objectContaining({
        code: 'QUOTE_CHANGED',
        headlessBuyErrorCode: 'QUOTE_CHANGED',
      }),
    );
  });

  it('rejects malformed accepted fee fields', () => {
    const accepted = buildAcceptedQuote({ providerFee: 'not-a-number' });
    const native = buildNativeQuote();

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).toThrow(QuoteChangedError);
  });

  it('rejects an unknown Transak fee breakdown identifier', () => {
    const accepted = buildAcceptedQuote();
    const native = buildNativeQuote({
      feeBreakdown: [{ id: 'future_fee', value: 0.7 }],
    });

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).toThrow(QuoteChangedError);
  });

  it('does not treat request identifiers as response asset validation', () => {
    const accepted = buildAcceptedQuote();
    const native = buildNativeQuote({
      requestedAssetId: 'eip155:137/slip44:60',
      requestedChainId: 'eip155:137',
    } as Partial<TransakBuyQuote>);

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).not.toThrow();
  });

  it('accepts a zero-fee quote with matching principal arithmetic', () => {
    const accepted = buildAcceptedQuote({
      providerFee: 0,
      networkFee: 0,
      extraFee: 0,
      totalFees: 0,
    });
    const native = buildNativeQuote({
      totalFee: 0,
      feeBreakdown: [],
    });

    expect(() =>
      assertTransakQuoteParity(accepted, native, EXPECTED_CONTEXT),
    ).not.toThrow();
  });

  it.each([
    ['/payments/apple-pay', 'apple_pay'],
    ['/payments/debit-credit-card', 'credit_debit_card'],
  ])(
    'validates the $15 %s fee-on-top contract',
    (paymentMethod, nativePaymentMethod) => {
      const accepted = buildAcceptedQuote({ paymentMethod });
      const native = buildNativeQuote({
        paymentMethod: nativePaymentMethod,
      });

      expect(() =>
        assertTransakQuoteParity(accepted, native, {
          ...EXPECTED_CONTEXT,
          paymentMethod,
        }),
      ).not.toThrow();
    },
  );
});
