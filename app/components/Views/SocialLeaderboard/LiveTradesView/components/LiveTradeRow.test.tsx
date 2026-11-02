import { lightTheme } from '@metamask/design-tokens';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { getSocialEntryOptionsTriggerTestId } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import { MOCK_LIVE_TRADES_ITEMS } from '../mocks/liveTradesFeed.mock';
import LiveTradeRow from './LiveTradeRow';
import {
  getLiveTradeCardTestId,
  getLiveTradeHeaderTestId,
  getLiveTradeRowTestId,
} from './LiveTradeRow.testIds';
import type { LiveTradeRowModel } from '../types';

jest.mock('../../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    colors,
  }: {
    children?: React.ReactNode;
    colors: string[];
  }) => (
    <View testID="live-trade-card-gradient" colors={colors}>
      {children}
    </View>
  );
});

const gradientTint = (): string =>
  screen.getByTestId('live-trade-card-gradient').props.colors[0];

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

  describe('open trade', () => {
    it('lays the card out as an open position with running P&L', () => {
      const openItem: LiveTradeRowModel = {
        ...item,
        isClosed: false,
        pnlValueLabel: '+$1.5K',
        pnlLabel: '+25%',
      };

      renderWithProvider(
        <LiveTradeRow
          item={openItem}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
        />,
      );

      expect(
        screen.getByTestId(getLiveTradeHeaderTestId(item.id)),
      ).toBeOnTheScreen();
      expect(screen.getByText('+$1.5K')).toBeOnTheScreen();
      expect(screen.getByText('+25%')).toBeOnTheScreen();
      expect(screen.getByText(item.subtitleLabel)).toBeOnTheScreen();
    });

    it('keeps an open trade neutral whichever way it is running', () => {
      renderWithProvider(
        <LiveTradeRow
          item={{ ...item, isClosed: false, isPnlPositive: false }}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
        />,
      );

      expect(gradientTint()).toContain(lightTheme.colors.icon.default);
    });
  });

  describe('closed trade', () => {
    const closedAtMs = 1_700_000_000_000;
    const now = closedAtMs + 30_000;

    const closedItem = (
      overrides: Partial<LiveTradeRowModel> = {},
    ): LiveTradeRowModel => ({
      ...item,
      isClosed: true,
      valueLabel: '+$96.38',
      pnlLabel: '+38.2%',
      isPnlPositive: true,
      closedAtMs,
      ...overrides,
    });

    it('merges the realized P&L into one result line and shows the close time', () => {
      renderWithProvider(
        <LiveTradeRow
          item={closedItem()}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
          now={now}
        />,
      );

      expect(
        screen.getByTestId(getLiveTradeHeaderTestId(item.id)),
      ).toBeOnTheScreen();
      expect(screen.getByText('+$96.38 (+38.2%)')).toBeOnTheScreen();
      expect(screen.getByText('Closed Just now')).toBeOnTheScreen();
    });

    it('washes a closed winner green', () => {
      renderWithProvider(
        <LiveTradeRow
          item={closedItem({ isPnlPositive: true })}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
          now={now}
        />,
      );

      expect(gradientTint()).toContain(lightTheme.colors.success.default);
    });

    it('washes a closed loser red', () => {
      renderWithProvider(
        <LiveTradeRow
          item={closedItem({ isPnlPositive: false })}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
          now={now}
        />,
      );

      expect(gradientTint()).toContain(lightTheme.colors.error.default);
    });

    it('keeps a closed trade neutral when no PnL is available', () => {
      renderWithProvider(
        <LiveTradeRow
          item={closedItem({
            valueLabel: '',
            pnlLabel: '',
            pnlValueLabel: undefined,
            isPnlPositive: false,
          })}
          onPositionPress={onPositionPress}
          onTraderPress={onTraderPress}
          now={now}
        />,
      );

      expect(gradientTint()).toContain(lightTheme.colors.icon.default);
    });
  });
});
