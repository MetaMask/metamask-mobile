import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictGameSelection,
  PredictHexColor,
  PredictMarket,
  PredictTimestamp,
} from '../../types';
import { MarketGroupCardTestIds as TestIds } from './MarketGroupCard.testIds';
import { SpreadMarketGroupCard } from './SpreadMarketGroupCard';

const GROUP = 'KXNFLSPREAD-26OCT29CARGB:spread';
// Team colors come from the Venue, not design tokens.
const GREEN_BAY_GREEN = `#${'203731'}`;

const createSpread = (
  id: string,
  value: number,
  yesSelection?: PredictGameSelection,
): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Spread ${value}`,
  status: 'active',
  group: {
    key: GROUP,
    groupType: 'marketSelector',
    marketType: 'spread',
    option: { type: 'number', value },
  },
  outcomes: [
    {
      id: `${id}:yes` as PredictEntityId,
      side: 'yes',
      label: 'Green Bay',
      askPrice: '0.46' as PredictDecimal,
      gameSelection: yesSelection,
    },
    {
      id: `${id}:no` as PredictEntityId,
      side: 'no',
      label: 'Carolina',
      askPrice: '0.54' as PredictDecimal,
    },
  ],
});

const game: PredictGame = {
  status: 'scheduled',
  awayTeam: { name: 'Carolina Panthers' },
  homeTeam: {
    name: 'Green Bay Packers',
    primaryColor: GREEN_BAY_GREEN as PredictHexColor,
  },
  observedAt: '2026-10-29T12:00:00Z' as PredictTimestamp,
};

const renderCard = (market: PredictMarket, eventGame?: PredictGame) =>
  render(
    <SpreadMarketGroupCard
      groupKey={GROUP}
      markets={[market]}
      selectedMarket={market}
      onSelectMarket={jest.fn()}
      onRulesPress={jest.fn()}
      game={eventGame}
    />,
  );

const row = (market: PredictMarket, side: 'yes' | 'no') =>
  screen.getByTestId(TestIds.row(GROUP, market.id, side));
const line = (market: PredictMarket, side: 'yes' | 'no') =>
  screen.getByTestId(TestIds.quoteBar(GROUP, market.id, side));

describe('SpreadMarketGroupCard', () => {
  it('shows each row handicap without a Team prefix', () => {
    const market = createSpread('GB7', -7.5, 'home');
    renderCard(market, game);

    expect(row(market, 'yes')).toHaveTextContent(/Green Bay.*-7\.5.*46¢/);
    expect(row(market, 'no')).toHaveTextContent(/Carolina.*\+7\.5.*54¢/);
  });

  it('colors the yes row by its Team and the no row by the other Team', () => {
    const market = createSpread('GB7', -7.5, 'home');
    renderCard(market, game);

    expect(line(market, 'yes')).toHaveStyle({
      backgroundColor: GREEN_BAY_GREEN,
    });
    expect(screen.getByText('46¢')).toHaveStyle({ color: GREEN_BAY_GREEN });
    // Carolina sends no color: the theme's away fallback.
    expect(line(market, 'no')).toHaveStyle({
      backgroundColor: lightTheme.colors.info.default,
    });
    expect(screen.getByText('54¢')).toHaveStyle({
      color: lightTheme.colors.info.default,
    });
  });

  it('uses success and error without a Team selection', () => {
    const market = createSpread('GB7', -7.5);
    renderCard(market, game);

    expect(line(market, 'yes')).toHaveStyle({
      backgroundColor: lightTheme.colors.success.default,
    });
    expect(line(market, 'no')).toHaveStyle({
      backgroundColor: lightTheme.colors.error.default,
    });
  });

  it('falls back to the theme Team colors without a Game', () => {
    const market = createSpread('CAR3', -3.5, 'away');
    renderCard(market);

    expect(line(market, 'yes')).toHaveStyle({
      backgroundColor: lightTheme.colors.info.default,
    });
    expect(line(market, 'no')).toHaveStyle({
      backgroundColor: lightTheme.colors.success.default,
    });
  });
});
