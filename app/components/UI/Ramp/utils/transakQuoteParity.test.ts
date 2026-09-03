import type { TransakBuyQuote } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import {
  acceptedAmountMatchesRequest,
  assertTransakFeeInclusiveParity,
  QuoteChangedError,
} from './transakQuoteParity';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const ASSET_ID = 'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da';

const ACCEPTED_QUOTE = {
  provider: '/providers/transak-native',
  outputCurrency: { assetId: ASSET_ID },
  quote: {
    amountIn: 16.4,
    amountOut: 14.88,
    paymentMethod: '/payments/debit-credit-card',
    providerFee: 1.4,
  },
} as unknown as Quote;

const NATIVE_QUOTE: TransakBuyQuote = {
  quoteId: 'quote-1',
  conversionPrice: 1,
  marketConversionPrice: 1,
  slippage: 0,
  fiatCurrency: 'USD',
  cryptoCurrency: 'MUSD',
  paymentMethod: 'credit_debit_card',
  fiatAmount: 16.4,
  cryptoAmount: 14.88,
  isBuyOrSell: 'BUY',
  network: 'monad',
  feeDecimal: 1.4 / 16.4,
  totalFee: 1.4,
  feeBreakdown: [
    { id: 'transak_fee', name: 'Transak fee', value: 1.4 },
    { id: 'network_fee', name: 'Third Party fee', value: 0 },
  ],
  nonce: 1,
  cryptoLiquidityProvider: 'transak',
  notes: [],
  requestedAssetId: ASSET_ID,
  requestedChainId: 'eip155:143',
};

describe('assertTransakFeeInclusiveParity', () => {
  it('accepts the captured debit-card Transak fee payload', () => {
    expect(() =>
      assertTransakFeeInclusiveParity(ACCEPTED_QUOTE, NATIVE_QUOTE, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).not.toThrow();
  });

  it('normalizes the Apple Pay provider code for a synthetic quote', () => {
    const acceptedQuote = {
      ...ACCEPTED_QUOTE,
      quote: {
        ...(ACCEPTED_QUOTE as typeof ACCEPTED_QUOTE).quote,
        paymentMethod: '/payments/apple-pay',
      },
    } as Quote;
    const nativeQuote = { ...NATIVE_QUOTE, paymentMethod: 'apple_pay' };

    expect(() =>
      assertTransakFeeInclusiveParity(acceptedQuote, nativeQuote, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/apple-pay',
      }),
    ).not.toThrow();
  });

  it('does not treat debit/card as Apple Pay', () => {
    const acceptedQuote = {
      ...(ACCEPTED_QUOTE as object),
      quote: {
        ...(ACCEPTED_QUOTE as typeof ACCEPTED_QUOTE).quote,
        paymentMethod: '/payments/apple-pay',
      },
    } as Quote;

    expect(() =>
      assertTransakFeeInclusiveParity(acceptedQuote, NATIVE_QUOTE, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/apple-pay',
      }),
    ).toThrow(
      expect.objectContaining({
        mismatchCategories: expect.arrayContaining(['payment_method']),
      }),
    );
  });

  it('rejects changed amounts and provider fees at cent precision', () => {
    const nativeQuote = {
      ...NATIVE_QUOTE,
      fiatAmount: 16.41,
      feeBreakdown: [
        { id: 'transak_fee', name: 'Transak fee', value: 1.41 },
        { id: 'network_fee', name: 'Third Party fee', value: 0 },
      ],
      totalFee: 1.41,
    };

    expect(() =>
      assertTransakFeeInclusiveParity(ACCEPTED_QUOTE, nativeQuote, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).toThrow(
      expect.objectContaining({
        mismatchCategories: expect.arrayContaining([
          'fiat_amount',
          'provider_fee',
          'fee_total',
        ]),
      }),
    );
  });

  it('compares received mUSD as an exact decimal token amount', () => {
    for (const cryptoAmount of [14.304, 14.296]) {
      expect(() =>
        assertTransakFeeInclusiveParity(
          {
            ...(ACCEPTED_QUOTE as object),
            quote: {
              ...(ACCEPTED_QUOTE as typeof ACCEPTED_QUOTE).quote,
              amountOut: 14.3,
            },
          } as Quote,
          { ...NATIVE_QUOTE, cryptoAmount },
          {
            assetId: ASSET_ID,
            paymentMethod: '/payments/debit-credit-card',
          },
        ),
      ).toThrow(
        expect.objectContaining({
          mismatchCategories: expect.arrayContaining(['crypto_amount']),
        }),
      );
    }
  });

  it('treats omitted accepted fee components as displayed zero', () => {
    const acceptedQuote = {
      ...(ACCEPTED_QUOTE as object),
      quote: {
        ...(ACCEPTED_QUOTE as typeof ACCEPTED_QUOTE).quote,
        providerFee: undefined,
        networkFee: undefined,
      },
    } as Quote;
    const nativeQuote = {
      ...NATIVE_QUOTE,
      totalFee: 0,
      feeBreakdown: [
        { id: 'transak_fee', name: 'Transak fee', value: 0 },
        { id: 'network_fee', name: 'Third Party fee', value: 0 },
      ],
    };

    expect(() =>
      assertTransakFeeInclusiveParity(acceptedQuote, nativeQuote, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).not.toThrow();
  });

  it('rejects malformed accepted fee values', () => {
    const acceptedQuote = {
      ...(ACCEPTED_QUOTE as object),
      quote: {
        ...(ACCEPTED_QUOTE as typeof ACCEPTED_QUOTE).quote,
        providerFee: -1,
      },
    } as Quote;

    expect(() =>
      assertTransakFeeInclusiveParity(acceptedQuote, NATIVE_QUOTE, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).toThrow(
      expect.objectContaining({
        mismatchCategories: expect.arrayContaining(['provider_fee']),
      }),
    );
  });

  it('rejects missing and malformed fee breakdowns as quote changes', () => {
    for (const feeBreakdown of [undefined, { id: 'transak_fee' }]) {
      expect(() =>
        assertTransakFeeInclusiveParity(
          ACCEPTED_QUOTE,
          { ...NATIVE_QUOTE, feeBreakdown } as unknown as TransakBuyQuote,
          {
            assetId: ASSET_ID,
            paymentMethod: '/payments/debit-credit-card',
          },
        ),
      ).toThrow(
        expect.objectContaining({
          mismatchCategories: expect.arrayContaining(['fee_breakdown']),
        }),
      );
    }
  });

  it('rejects the wrong native response asset or network', () => {
    for (const nativeQuote of [
      { ...NATIVE_QUOTE, cryptoCurrency: 'USDC' },
      { ...NATIVE_QUOTE, network: 'ethereum' },
    ]) {
      expect(() =>
        assertTransakFeeInclusiveParity(ACCEPTED_QUOTE, nativeQuote, {
          assetId: ASSET_ID,
          paymentMethod: '/payments/debit-credit-card',
        }),
      ).toThrow(
        expect.objectContaining({
          mismatchCategories: expect.arrayContaining(['asset']),
        }),
      );
    }
  });

  it('rejects a charged partner fee for discounted mUSD', () => {
    const nativeQuote = {
      ...NATIVE_QUOTE,
      feeBreakdown: [
        ...NATIVE_QUOTE.feeBreakdown,
        { id: 'partner_fee', name: 'Partner fee', value: 0.1 },
      ],
      totalFee: 1.5,
    };

    expect(() =>
      assertTransakFeeInclusiveParity(ACCEPTED_QUOTE, nativeQuote, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).toThrow(QuoteChangedError);
  });

  it('rejects unknown charged fee components', () => {
    const nativeQuote = {
      ...NATIVE_QUOTE,
      feeBreakdown: [
        ...NATIVE_QUOTE.feeBreakdown,
        { id: 'unknown_fee', name: 'Unknown fee', value: 0.1 },
      ],
      totalFee: 1.5,
    };

    expect(() =>
      assertTransakFeeInclusiveParity(ACCEPTED_QUOTE, nativeQuote, {
        assetId: ASSET_ID,
        paymentMethod: '/payments/debit-credit-card',
      }),
    ).toThrow(
      expect.objectContaining({
        mismatchCategories: expect.arrayContaining(['fee_breakdown']),
      }),
    );
  });
});

describe('acceptedAmountMatchesRequest', () => {
  it('matches accepted and requested amounts at cent precision', () => {
    expect(acceptedAmountMatchesRequest(ACCEPTED_QUOTE, 16.404)).toBe(true);
  });

  it('rejects a changed aggregator amount', () => {
    expect(acceptedAmountMatchesRequest(ACCEPTED_QUOTE, 16.41)).toBe(false);
  });
});
