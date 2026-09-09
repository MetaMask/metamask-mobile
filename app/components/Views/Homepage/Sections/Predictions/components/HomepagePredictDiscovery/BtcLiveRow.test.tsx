import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../../../UI/Predict/constants/btcUpDown5mSeries';
import BtcLiveRow, { BTC_LIVE_DISCONNECT_DELAY_MS } from './BtcLiveRow';

const mockIsRowVisible = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));
jest.mock('react-redux', () => ({
  useSelector: () => true,
}));
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));
jest.mock(
  '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData',
);
jest.mock('../../../../hooks/useSectionViewportVisible', () => ({
  __esModule: true,
  default: () => ({
    isVisible: mockIsRowVisible(),
    onLayout: jest.fn(),
  }),
}));
jest.mock('./HomepagePredictDiscoveryMaterialGlyph', () => () => null);
jest.mock('./HomepagePredictDiscoveryLivePill', () => () => null);

const renderRow = (series = BTC_UP_OR_DOWN_5M_SERIES) =>
  render(<BtcLiveRow series={series} onPress={jest.fn()} />);

describe('BtcLiveRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsRowVisible.mockReturnValue(true);
    jest.mocked(useCurrentCryptoUpDownMarketData).mockReturnValue({
      marketId: undefined,
      market: undefined,
      currentPrice: undefined,
      priceToBeat: undefined,
      countdown: '',
    } as unknown as ReturnType<typeof useCurrentCryptoUpDownMarketData>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queries the supplied series definition', () => {
    const series = {
      ...BTC_UP_OR_DOWN_5M_SERIES,
      title: 'Configured BTC series',
    };

    renderRow(series);

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenCalledWith({
      series,
      enabled: true,
      withChartData: false,
    });
  });

  it('disables live market data when the row is off-screen on first paint', () => {
    mockIsRowVisible.mockReturnValue(false);

    renderRow();

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenCalledWith({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: false,
      withChartData: false,
    });
  });

  it('keeps live market data enabled for 5 seconds after the row scrolls off-screen', () => {
    const { rerender } = renderRow();

    mockIsRowVisible.mockReturnValue(false);
    rerender(<BtcLiveRow series={BTC_UP_OR_DOWN_5M_SERIES} onPress={jest.fn()} />);

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenLastCalledWith({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: true,
      withChartData: false,
    });

    act(() => {
      jest.advanceTimersByTime(BTC_LIVE_DISCONNECT_DELAY_MS - 1);
    });

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenLastCalledWith({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: true,
      withChartData: false,
    });

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenLastCalledWith({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: false,
      withChartData: false,
    });
  });

  it('keeps live market data enabled when the row returns before the disconnect delay', () => {
    const { rerender } = renderRow();

    mockIsRowVisible.mockReturnValue(false);
    rerender(<BtcLiveRow series={BTC_UP_OR_DOWN_5M_SERIES} onPress={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    mockIsRowVisible.mockReturnValue(true);
    rerender(<BtcLiveRow series={BTC_UP_OR_DOWN_5M_SERIES} onPress={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(BTC_LIVE_DISCONNECT_DELAY_MS);
    });

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenLastCalledWith({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: true,
      withChartData: false,
    });
  });
});
