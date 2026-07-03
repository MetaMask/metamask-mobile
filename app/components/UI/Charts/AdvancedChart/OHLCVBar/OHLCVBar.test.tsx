import React from 'react';
import { render } from '@testing-library/react-native';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { OHLCVBar } from './OHLCVBar';
import type { CrosshairData } from '../AdvancedChart.types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../Predict/utils/format', () => ({
  formatPriceWithSubscriptNotation: jest.fn(
    (
      price: number,
      currency: string,
      opts?: { maxDigitsAfterSubscript?: number },
    ) => `fmt:${price}:${currency}:${opts?.maxDigitsAfterSubscript ?? 'none'}`,
  ),
}));

const mockFormatPrice = jest.mocked(formatPriceWithSubscriptNotation);

describe('OHLCVBar', () => {
  const baseData: CrosshairData = {
    time: 1,
    open: 10,
    high: 20,
    low: 5,
    close: 15,
    volume: 1_000_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls formatPriceWithSubscriptNotation with maxDigitsAfterSubscript 1 for OHLC fields', () => {
    render(<OHLCVBar data={baseData} currency="EUR" testID="ohlcv-bar" />);

    const subscriptOpts = { maxDigitsAfterSubscript: 1 };
    expect(mockFormatPrice).toHaveBeenCalledWith(
      baseData.open,
      'EUR',
      subscriptOpts,
    );
    expect(mockFormatPrice).toHaveBeenCalledWith(
      baseData.close,
      'EUR',
      subscriptOpts,
    );
    expect(mockFormatPrice).toHaveBeenCalledWith(
      baseData.high,
      'EUR',
      subscriptOpts,
    );
    expect(mockFormatPrice).toHaveBeenCalledWith(
      baseData.low,
      'EUR',
      subscriptOpts,
    );
    expect(mockFormatPrice).toHaveBeenCalledTimes(4);
  });

  it('renders formatted open, high, low, close from the memoized formatter', () => {
    const { getByTestId } = render(
      <OHLCVBar data={baseData} currency="USD" testID="ohlcv-bar" />,
    );

    const bar = getByTestId('ohlcv-bar');
    expect(bar).toHaveTextContent(/fmt:10:USD:1/);
    expect(bar).toHaveTextContent(/fmt:20:USD:1/);
    expect(bar).toHaveTextContent(/fmt:5:USD:1/);
    expect(bar).toHaveTextContent(/fmt:15:USD:1/);
  });

  it('renders an em dash for zero volume in the volume column', () => {
    const { getByTestId, getByText } = render(
      <OHLCVBar
        data={{ ...baseData, volume: 0 }}
        currency="USD"
        testID="ohlcv-bar"
      />,
    );

    expect(getByTestId('ohlcv-bar')).toHaveTextContent(/—/);
    expect(getByText('perps.chart.ohlc.volume')).toBeOnTheScreen();
  });

  it('omits volume row when volume is undefined', () => {
    const { queryByText } = render(
      <OHLCVBar
        data={{ ...baseData, volume: undefined }}
        currency="USD"
        testID="ohlcv-bar"
      />,
    );

    expect(queryByText('perps.chart.ohlc.volume')).not.toBeOnTheScreen();
  });

  it('renders non-zero volume with currency-aware formatting', () => {
    const { getByTestId } = render(
      <OHLCVBar data={baseData} currency="USD" testID="ohlcv-bar" />,
    );

    expect(getByTestId('ohlcv-bar')).toHaveTextContent(/\$1\.00M/);
  });
});
