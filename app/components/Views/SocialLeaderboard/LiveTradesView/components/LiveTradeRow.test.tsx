import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { getSocialEntryOptionsTriggerTestId } from '../../components/SocialEntryOptionsBottomSheet.testIds';
import { MOCK_LIVE_TRADES_ITEMS } from '../mocks/liveTradesFeed.mock';
import LiveTradeRow from './LiveTradeRow';
import {
  getLiveTradeCardTestId,
  getLiveTradeRowTestId,
} from './LiveTradeRow.testIds';

jest.mock('../../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '../../../Homepage/Sections/TopTraders/components/TraderAvatar',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    };
  },
);

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => <View testID={testID}>{children}</View>;
});

describe('LiveTradeRow', () => {
  const onPositionPress = jest.fn();
  const onTraderPress = jest.fn();
  const item = MOCK_LIVE_TRADES_ITEMS[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trader handle and trade card', () => {
    renderWithProvider(
      <LiveTradeRow
        item={item}
        onPositionPress={onPositionPress}
        onTraderPress={onTraderPress}
      />,
    );

    expect(
      screen.getByTestId(getLiveTradeRowTestId(item.id)),
    ).toBeOnTheScreen();
    expect(screen.getByText('cented')).toBeOnTheScreen();
    expect(screen.getByText('PEPE')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getLiveTradeCardTestId(item.id)),
    ).toBeOnTheScreen();
  });

  it('opens the position from the trade card', () => {
    renderWithProvider(
      <LiveTradeRow
        item={item}
        onPositionPress={onPositionPress}
        onTraderPress={onTraderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(getLiveTradeCardTestId(item.id)));

    expect(onPositionPress).toHaveBeenCalledWith(item);
  });

  it('opens the trader profile from the identity', () => {
    renderWithProvider(
      <LiveTradeRow
        item={item}
        onPositionPress={onPositionPress}
        onTraderPress={onTraderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(`live-trade-trader-${item.id}`));

    expect(onTraderPress).toHaveBeenCalledWith(item);
  });

  it('exposes the moderation overflow trigger', () => {
    renderWithProvider(
      <LiveTradeRow
        item={item}
        onPositionPress={onPositionPress}
        onTraderPress={onTraderPress}
      />,
    );

    expect(
      screen.getByTestId(getSocialEntryOptionsTriggerTestId(item.id)),
    ).toBeOnTheScreen();
  });
});
