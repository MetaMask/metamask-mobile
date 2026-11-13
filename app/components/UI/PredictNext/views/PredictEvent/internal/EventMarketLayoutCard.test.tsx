import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { lightTheme } from '@metamask/design-tokens';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import { ChoiceMarketGroupCardTestIds } from '../../../events/markets/ChoiceMarketGroupCard.testIds';
import { MarketGroupCardTestIds } from '../../../events/markets/MarketGroupCard.testIds';
import { MarketStandardCardTestIds } from '../../../events/markets/MarketStandardCard.testIds';
import { MoneylineMarketGroupCardTestIds } from '../../../events/markets/MoneylineMarketGroupCard.testIds';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictGameSelection,
  PredictMarket,
  PredictMarketGroup,
  PredictTimestamp,
} from '../../../types';
import type { MarketLayoutCard } from './createMarketLayoutProjection';
import {
  EventMarketLayoutCard,
  getLayoutCardMarketIds,
} from './EventMarketLayoutCard';

jest.mock('../../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const game: PredictGame = {
  status: 'scheduled',
  awayTeam: { name: 'Chicago Bears', abbreviation: 'CHI' },
  homeTeam: { name: 'Seattle Seahawks', abbreviation: 'SEA' },
  observedAt: '2026-11-02T12:00:00Z' as PredictTimestamp,
};

const createMarket = (
  id: string,
  group: PredictMarketGroup,
  gameSelection?: PredictGameSelection,
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  group,
  outcomes: [
    {
      id: `${id}:yes` as PredictEntityId,
      side: 'yes',
      label: id === 'over' || id === 'over-2' ? 'Over' : id,
      askPrice: '0.40' as PredictDecimal,
      gameSelection,
    },
    {
      id: `${id}:no` as PredictEntityId,
      side: 'no',
      label: 'Under',
      askPrice: '0.60' as PredictDecimal,
    },
  ],
});

const line = (key: string, marketType: string, value: number) => ({
  key,
  groupType: 'marketSelector',
  marketType,
  option: { type: 'number' as const, value },
});

const moneyline: MarketLayoutCard = {
  type: 'choice',
  key: 'moneyline',
  markets: [
    createMarket('away', { key: 'moneyline', groupType: 'choice' }, 'away'),
    createMarket('home', { key: 'moneyline', groupType: 'choice' }, 'home'),
  ],
};

const lines = (
  key: string,
  marketType: string,
  gameSelection?: PredictGameSelection,
): MarketLayoutCard => ({
  type: 'marketSelector',
  key,
  marketType,
  markets: [
    createMarket('over', line(key, marketType, 20.5), gameSelection),
    createMarket('over-2', line(key, marketType, 23.5), gameSelection),
  ].map((market) => ({ ...market, rules: 'Resolves on the final score.' })),
});

const renderCard = (
  card: MarketLayoutCard,
  {
    withGame = true,
    selectedMarketId,
  }: { withGame?: boolean; selectedMarketId?: string } = {},
) => {
  const props = {
    onSelectMarket: jest.fn(),
    onOrder: jest.fn(),
    onRulesPress: jest.fn(),
  };
  render(
    <EventMarketLayoutCard
      card={card}
      game={withGame ? game : undefined}
      selectedMarketId={selectedMarketId as PredictEntityId | undefined}
      {...props}
    />,
  );
  return props;
};

describe('EventMarketLayoutCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a choice group as the moneyline card', () => {
    renderCard(moneyline);

    expect(
      screen.getByTestId(MoneylineMarketGroupCardTestIds.card('moneyline')),
    ).toBeOnTheScreen();
  });

  const henry: MarketLayoutCard = {
    type: 'choice',
    key: 'henry',
    markets: [
      createMarket(
        'henry-40',
        { key: 'henry', groupType: 'choice', label: 'Derrick Henry' },
        'away',
      ),
    ],
  };

  it("renders a labelled choice group as a choice card titled with its label, in its Team's color", () => {
    const { onOrder } = renderCard(henry);

    expect(
      screen.getByTestId(ChoiceMarketGroupCardTestIds.title('henry')),
    ).toHaveTextContent('Derrick Henry');
    expect(
      screen.queryByTestId(MoneylineMarketGroupCardTestIds.card('henry')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(
        ChoiceMarketGroupCardTestIds.line('henry', 'henry-40'),
      ),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.info.default });

    fireEvent.press(
      screen.getByTestId(
        ChoiceMarketGroupCardTestIds.price('henry', 'henry-40'),
      ),
    );
    expect(onOrder).toHaveBeenCalledWith(
      henry.markets[0],
      henry.markets[0].outcomes[0],
    );
  });

  it('reads the label from any row, not only the first', () => {
    renderCard({
      ...henry,
      markets: [
        createMarket('henry-20', { key: 'henry', groupType: 'choice' }, 'away'),
        ...henry.markets,
      ],
    });

    expect(
      screen.getByTestId(ChoiceMarketGroupCardTestIds.title('henry')),
    ).toHaveTextContent('Derrick Henry');
  });

  // A Player the backend couldn't name: every row backs the same Team.
  it('renders unlabelled rows that back one Team as an untitled choice card with their own labels', () => {
    const unnamed: MarketLayoutCard = {
      type: 'choice',
      key: 'unnamed',
      markets: ['40+ yards', '60+ yards'].map((id) =>
        createMarket(id, { key: 'unnamed', groupType: 'choice' }, 'away'),
      ),
    };
    renderCard(unnamed);

    expect(
      screen.queryByTestId(MoneylineMarketGroupCardTestIds.card('unnamed')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(ChoiceMarketGroupCardTestIds.title('unnamed')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(
        ChoiceMarketGroupCardTestIds.row('unnamed', '40+ yards'),
      ),
    ).toHaveTextContent(/40\+ yards/);
    expect(
      screen.getByTestId(
        ChoiceMarketGroupCardTestIds.row('unnamed', '60+ yards'),
      ),
    ).toHaveTextContent(/60\+ yards/);
  });

  it('renders a single unlabelled row as a choice card, not a moneyline', () => {
    renderCard({ ...moneyline, markets: moneyline.markets.slice(0, 1) });

    expect(
      screen.queryByTestId(MoneylineMarketGroupCardTestIds.card('moneyline')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(ChoiceMarketGroupCardTestIds.row('moneyline', 'away')),
    ).toHaveTextContent(/away/);
  });

  it('colors a labelled choice card neutrally without a Game', () => {
    renderCard(henry, { withGame: false });

    expect(
      screen.getByTestId(
        ChoiceMarketGroupCardTestIds.line('henry', 'henry-40'),
      ),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.text.alternative });
  });

  it('renders a choice group as standard cards when the Event has no Game', () => {
    renderCard(moneyline, { withGame: false });

    expect(
      screen.queryByTestId(MoneylineMarketGroupCardTestIds.card('moneyline')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.card('away')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.card('home')),
    ).toBeOnTheScreen();
  });

  it.each([
    ['spread', 'spreads'],
    ['total', 'totals'],
  ])('renders a %s line picker without a title', (type, key) => {
    renderCard(lines(key, type));

    expect(
      screen.getByTestId(MarketGroupCardTestIds.card(key)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MarketGroupCardTestIds.title(key)),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['away', game.awayTeam.name],
    ['home', game.homeTeam.name],
  ] as const)(
    'titles a team total with the %s Team its yes Outcome backs',
    (selection, title) => {
      renderCard(lines('team-total', 'team_total', selection));

      expect(
        screen.getByTestId(MarketGroupCardTestIds.title('team-total')),
      ).toHaveTextContent(title);
      expect(
        screen.getByTestId(MarketGroupCardTestIds.title('team-total')),
      ).not.toHaveProp('accessibilityRole', 'button');
    },
  );

  it.each([
    ['without a Team', lines('team-total', 'team_total'), true],
    ['without a Game', lines('team-total', 'team_total', 'away'), false],
  ])('titles a team total "Team total" %s', (_, card, withGame) => {
    renderCard(card, { withGame });

    expect(
      screen.getByTestId(MarketGroupCardTestIds.title('team-total')),
    ).toHaveTextContent(strings('predict_next.event.market_layout.team_total'));
  });

  it('shows the selected line and reports a new one with the group key', () => {
    const { onSelectMarket } = renderCard(lines('totals', 'total'), {
      selectedMarketId: 'over-2',
    });

    expect(
      screen.getByTestId(MarketGroupCardTestIds.option('totals', 'over-2')),
    ).toHaveProp('accessibilityState', { selected: true });

    fireEvent.press(
      screen.getByTestId(MarketGroupCardTestIds.option('totals', 'over')),
    );

    expect(onSelectMarket).toHaveBeenCalledWith('totals', 'over');
  });

  it('falls back to the first line when the selected one is gone', () => {
    renderCard(lines('totals', 'total'), { selectedMarketId: 'gone' });

    expect(
      screen.getByTestId(MarketGroupCardTestIds.option('totals', 'over')),
    ).toHaveProp('accessibilityState', { selected: true });
  });

  it('renders lines of an unknown market type as standard cards and warns in development', () => {
    renderCard(lines('player-a', 'player_points'));

    expect(
      screen.queryByTestId(MarketGroupCardTestIds.card('player-a')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.card('over')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MarketStandardCardTestIds.card('over-2')),
    ).toBeOnTheScreen();
    expect(DevLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('player_points'),
    );
  });

  it('renders a standard card and forwards its order and rules presses', () => {
    const market = createMarket('single', { key: '', groupType: 'choice' });
    const { onOrder, onRulesPress } = renderCard({
      type: 'standard',
      key: 'market:single',
      market: { ...market, group: undefined, rules: 'Rules' },
    });

    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.yesButton('single')),
    );
    fireEvent.press(
      screen.getByTestId(MarketStandardCardTestIds.title('single')),
    );

    expect(onOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'single' }),
      expect.objectContaining({ side: 'yes' }),
    );
    expect(onRulesPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'single' }),
    );
  });
});

describe('getLayoutCardMarketIds', () => {
  it('names the one Market of a standard card', () => {
    const market = createMarket('solo', { key: 'solo', groupType: 'choice' });
    expect(
      getLayoutCardMarketIds({ type: 'standard', key: 'solo', market }),
    ).toEqual(['solo']);
  });

  it('names every row of a choice card', () => {
    expect(getLayoutCardMarketIds(moneyline)).toEqual(['away', 'home']);
  });

  it('names only the selected line of a line picker', () => {
    expect(getLayoutCardMarketIds(lines('totals', 'total'))).toEqual(['over']);
    expect(
      getLayoutCardMarketIds(
        lines('totals', 'total'),
        'over-2' as PredictEntityId,
      ),
    ).toEqual(['over-2']);
    expect(
      getLayoutCardMarketIds(
        lines('totals', 'total'),
        'gone' as PredictEntityId,
      ),
    ).toEqual(['over']);
  });

  it('names every line of a market type without a picker', () => {
    expect(getLayoutCardMarketIds(lines('player-a', 'player_points'))).toEqual([
      'over',
      'over-2',
    ]);
  });
});
