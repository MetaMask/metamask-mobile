import React from 'react';
import { render } from '@testing-library/react-native';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../../../UI/Predict/constants/btcUpDown5mSeries';
import BtcLiveRow from './BtcLiveRow';

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
jest.mock('./HomepagePredictDiscoveryMaterialGlyph', () => () => null);
jest.mock('./HomepagePredictDiscoveryLivePill', () => () => null);

describe('BtcLiveRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useCurrentCryptoUpDownMarketData).mockReturnValue({
      marketId: undefined,
      market: undefined,
      currentPrice: undefined,
      priceToBeat: undefined,
      countdown: '',
    } as unknown as ReturnType<typeof useCurrentCryptoUpDownMarketData>);
  });

  it('queries the supplied series definition', () => {
    const series = {
      ...BTC_UP_OR_DOWN_5M_SERIES,
      title: 'Configured BTC series',
    };

    render(<BtcLiveRow series={series} onPress={jest.fn()} />);

    expect(useCurrentCryptoUpDownMarketData).toHaveBeenCalledWith({
      series,
      enabled: true,
      withChartData: false,
    });
  });
});
