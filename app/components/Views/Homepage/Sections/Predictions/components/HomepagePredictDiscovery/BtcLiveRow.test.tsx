import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import { BtcLiveRowTestIds } from './BtcLiveRow.testIds';
import BtcLiveRow from './BtcLiveRow';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => undefined,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');

  return {
    Box: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
    BoxFlexDirection: {
      Column: 'column',
    },
    Icon: () => null,
    IconColor: {
      IconAlternative: 'IconAlternative',
    },
    IconName: {
      ArrowRight: 'ArrowRight',
    },
    IconSize: {
      Sm: 'Sm',
    },
    Text: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.Text>{children}</ReactNative.Text>
    ),
    TextColor: {
      TextAlternative: 'TextAlternative',
      TextDefault: 'TextDefault',
    },
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
  };
});

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (_key: string, options?: Record<string, string>) =>
    options?.price ?? options?.value ?? '',
}));

jest.mock(
  '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData',
  () => ({
    useCurrentCryptoUpDownMarketData: jest.fn(),
  }),
);

jest.mock('./HomepagePredictDiscoveryMaterialGlyph', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./HomepagePredictDiscoveryLivePill', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => {
    const ReactNative = jest.requireActual('react-native');
    return <ReactNative.Text>{value}</ReactNative.Text>;
  },
}));

const mockUseCurrentCryptoUpDownMarketData =
  useCurrentCryptoUpDownMarketData as jest.Mock;

const MARKET = {
  id: 'btc-market',
  title: 'BTC Up or Down',
} as PredictMarket;

describe('BtcLiveRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.mocked(useSelector).mockReturnValue(true);
    mockUseCurrentCryptoUpDownMarketData.mockReturnValue({
      marketId: MARKET.id,
      market: MARKET,
      currentPrice: 93025,
      priceToBeat: 93000,
      countdown: '2:00',
    });
  });

  it.each`
    isPredictEnabled | isFocused | isVisible | expectedEnabled
    ${true}          | ${true}   | ${true}   | ${true}
    ${false}         | ${true}   | ${true}   | ${false}
    ${true}          | ${false}  | ${true}   | ${false}
    ${true}          | ${true}   | ${false}  | ${false}
  `(
    'passes enabled=$expectedEnabled when predict=$isPredictEnabled focus=$isFocused visible=$isVisible',
    ({ isPredictEnabled, isFocused, isVisible, expectedEnabled }) => {
      jest.mocked(useIsFocused).mockReturnValue(isFocused);
      jest.mocked(useSelector).mockReturnValue(isPredictEnabled);

      render(<BtcLiveRow isVisible={isVisible} onPress={jest.fn()} />);

      expect(mockUseCurrentCryptoUpDownMarketData).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: expectedEnabled }),
      );
    },
  );

  it('keeps the existing navigation contract when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<BtcLiveRow isVisible onPress={onPress} />);

    fireEvent.press(getByTestId(BtcLiveRowTestIds.Row));

    expect(onPress).toHaveBeenCalledWith(MARKET.id, MARKET);
  });
});
