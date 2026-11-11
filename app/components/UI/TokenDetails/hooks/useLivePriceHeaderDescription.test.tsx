import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import {
  LIVE_PRICE_HEADER_TEST_ID,
  LIVE_PRICE_SCROLL_THRESHOLD_PX,
  useLivePriceHeaderDescription,
} from './useLivePriceHeaderDescription';

describe('useLivePriceHeaderDescription', () => {
  it('returns no description before the page is scrolled', () => {
    const { result } = renderHook(() =>
      useLivePriceHeaderDescription({
        currentPrice: 1.23,
        currentCurrency: 'usd',
      }),
    );

    expect(result.current.description).toBeUndefined();
  });

  it('returns the formatted live price once scrolled past the threshold', () => {
    const { result } = renderHook(() =>
      useLivePriceHeaderDescription({
        currentPrice: 1.23,
        currentCurrency: 'usd',
      }),
    );

    act(() => {
      result.current.onScrollOffset(LIVE_PRICE_SCROLL_THRESHOLD_PX);
    });

    const { getByTestId } = render(<>{result.current.description}</>);
    expect(getByTestId(LIVE_PRICE_HEADER_TEST_ID)).toHaveTextContent('$1.23');
  });

  it('clears the description when scrolled back above the threshold', () => {
    const { result } = renderHook(() =>
      useLivePriceHeaderDescription({
        currentPrice: 1.23,
        currentCurrency: 'usd',
      }),
    );

    act(() => {
      result.current.onScrollOffset(LIVE_PRICE_SCROLL_THRESHOLD_PX + 50);
    });
    act(() => {
      result.current.onScrollOffset(LIVE_PRICE_SCROLL_THRESHOLD_PX - 1);
    });

    expect(result.current.description).toBeUndefined();
  });

  it.each([0, NaN, -1, null, undefined])(
    'returns no description when the price is %p',
    (currentPrice) => {
      const { result } = renderHook(() =>
        useLivePriceHeaderDescription({ currentPrice, currentCurrency: 'usd' }),
      );

      act(() => {
        result.current.onScrollOffset(LIVE_PRICE_SCROLL_THRESHOLD_PX);
      });

      expect(result.current.description).toBeUndefined();
    },
  );

  it('uses subscript notation for very small meme-coin prices', () => {
    const { result } = renderHook(() =>
      useLivePriceHeaderDescription({
        currentPrice: 0.0000123,
        currentCurrency: 'usd',
      }),
    );

    act(() => {
      result.current.onScrollOffset(LIVE_PRICE_SCROLL_THRESHOLD_PX);
    });

    const { getByTestId } = render(<>{result.current.description}</>);
    expect(getByTestId(LIVE_PRICE_HEADER_TEST_ID)).toHaveTextContent(/^\$0\./);
  });
});
