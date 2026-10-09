import { renderHook } from '@testing-library/react-native';
import { DiscountType, type QuoteResponse } from '@metamask/bridge-controller';
import { strings } from '../../../../../locales/i18n';
import { useFeeDisclaimer } from './useFeeDisclaimer';

const quoteWithFee = (metabridge: {
  quoteBpsFee?: number;
  baseBpsFee?: number;
  discountType?: DiscountType;
}): QuoteResponse =>
  ({
    quote: {
      dest: { asset: { symbol: 'ETH' } },
      feeData: { metabridge: [metabridge] },
    },
  }) as QuoteResponse;

describe('useFeeDisclaimer', () => {
  it('returns no-fee copy and a struck-through base fee for a subscription quote with a fee cut', () => {
    const { result } = renderHook(() =>
      useFeeDisclaimer({
        activeQuote: quoteWithFee({
          quoteBpsFee: 0.004156,
          baseBpsFee: 87.5,
          discountType: DiscountType.SUBSCRIPTION,
        }),
      }),
    );

    expect(result.current.infoText).toBeUndefined();
    expect(result.current.infoSuffix).toBe(
      strings('bridge.no_fees_with_orange'),
    );
    expect(result.current.baseFeePercentage).toBe(
      strings('bridge.fee_percentage', { feePercentage: 0.875 }),
    );
    expect(result.current.discountBadge).toEqual({
      type: DiscountType.SUBSCRIPTION,
    });
  });

  it('returns the regular MetaMask fee line when a subscription quote has no fee cut', () => {
    const { result } = renderHook(() =>
      useFeeDisclaimer({
        activeQuote: quoteWithFee({
          quoteBpsFee: 87.5,
          baseBpsFee: 87.5,
          discountType: DiscountType.SUBSCRIPTION,
        }),
      }),
    );

    expect(result.current.infoText).toBe(
      strings('bridge.fee_disclaimer', { feePercentage: 0.875 }),
    );
    expect(result.current.infoSuffix).toBeUndefined();
    expect(result.current.baseFeePercentage).toBeUndefined();
  });
});
