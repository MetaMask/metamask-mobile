import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { makePredictNextGameEvent } from '../../../../../../../tests/component-view/fixtures/predictNext';
import { formatGameStartShort } from '../../../events/game';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { HomeSportsSection } from './HomeSportsSection';

const STARTS_AT = '2026-11-15T18:00:00Z';
const GAMES = [
  makePredictNextGameEvent('nfl-3', 'Bills', 'Rams', 'NFL', {
    status: 'scheduled',
    startsAt: STARTS_AT,
    askPrices: { away: '0.37', home: '0.63' },
  }),
  makePredictNextGameEvent('nfl-4', 'Chiefs', 'Broncos', 'NFL', {
    status: 'scheduled',
    startsAt: STARTS_AT,
  }),
];

// Team logos are hidden from screen readers.
const HIDDEN = { includeHiddenElements: true };

const renderSection = (
  props: Partial<React.ComponentProps<typeof HomeSportsSection>> = {},
) =>
  render(
    <HomeSportsSection
      events={GAMES}
      isLoading={false}
      onOpen={jest.fn()}
      onOpenEvent={jest.fn()}
      onOrder={jest.fn()}
      {...props}
    />,
  );

describe('HomeSportsSection', () => {
  it('opens the row’s Feed Screen from the header and its chevron', () => {
    const onOpen = jest.fn();
    renderSection({ onOpen });

    const header = screen.getByTestId(PredictHomeTestIds.HOME_SPORTS_HEADER);
    expect(header).toHaveTextContent('Sports');
    expect(
      within(header).getByTestId(PredictHomeTestIds.HOME_SPORTS_CHEVRON),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sports' })).toBeOnTheScreen();

    fireEvent.press(header);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a 190pt small game card per Event, in order', () => {
    renderSection();

    const row = within(screen.getByTestId(PredictHomeTestIds.HOME_SPORTS_ROW));
    const cards = row.getAllByTestId(/^predict-next-event-kalshi-/);
    expect(cards.map((card) => card.props.testID)).toEqual(
      GAMES.map(({ id }) => PredictHomeTestIds.event('kalshi', id)),
    );
    cards.forEach((card) => expect(card).toHaveStyle({ width: 190 }));
  });

  it('shows the Competition and start, then each Team with its logo, abbreviation and price', () => {
    renderSection();

    const card = within(
      screen.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3')),
    );
    expect(
      card.getByTestId('predict-next-game-header-nfl-3-competition'),
    ).toHaveTextContent('NFL');
    expect(
      card.getByTestId('predict-next-game-header-nfl-3-start'),
    ).toHaveTextContent(formatGameStartShort(STARTS_AT));

    const away = within(card.getByTestId('predict-next-game-team-nfl-3-away'));
    expect(
      away.getByTestId('predict-next-game-logo-fallback-nfl-3-away', HIDDEN),
    ).toHaveTextContent('BIL');
    expect(
      away.getByTestId('predict-next-game-team-label-nfl-3-away'),
    ).toHaveTextContent('BIL');
    expect(
      away.getByTestId(PredictHomeTestIds.gameQuote('nfl-3', 'away')),
    ).toHaveTextContent('37¢');

    const home = within(card.getByTestId('predict-next-game-team-nfl-3-home'));
    expect(
      home.getByTestId('predict-next-game-logo-fallback-nfl-3-home', HIDDEN),
    ).toHaveTextContent('RAM');
    expect(
      home.getByTestId('predict-next-game-team-label-nfl-3-home'),
    ).toHaveTextContent('RAM');
    expect(
      home.getByTestId(PredictHomeTestIds.gameQuote('nfl-3', 'home')),
    ).toHaveTextContent('63¢');
  });

  it('scrolls freely, without snapping, with 16pt edges and 8pt between cards', () => {
    renderSection();

    const row = screen.getByTestId(PredictHomeTestIds.HOME_SPORTS_ROW);
    expect(row.props.horizontal).toBe(true);
    expect(row.props.snapToInterval).toBeUndefined();
    expect(row.props.pagingEnabled).toBeFalsy();
    expect(StyleSheet.flatten(row.props.contentContainerStyle)).toEqual({
      paddingLeft: 16,
      paddingRight: 16,
      gap: 8,
    });
    expect(screen.getByTestId(PredictHomeTestIds.HOME_SPORTS)).toHaveStyle({
      marginLeft: -16,
      marginRight: -16,
    });
  });

  it('opens the pressed Event', () => {
    const onOpenEvent = jest.fn();
    renderSection({ onOpenEvent });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.eventContent('kalshi', 'nfl-4')),
    );

    expect(onOpenEvent).toHaveBeenCalledTimes(1);
    expect(onOpenEvent).toHaveBeenCalledWith(GAMES[1]);
  });

  it('opens an Order from a price', () => {
    const onOrder = jest.fn();
    renderSection({ onOrder });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.gameQuote('nfl-3', 'away')),
    );

    expect(onOrder).toHaveBeenCalledTimes(1);
    expect(onOrder.mock.calls[0][0]).toBe(GAMES[0]);
  });

  it('renders nothing once loaded without an Event', () => {
    renderSection({ events: [] });

    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
    ).not.toBeOnTheScreen();
  });

  it('shows 190x134 skeleton cards in the row while loading', () => {
    renderSection({ events: [], isLoading: true });

    expect(
      screen.getByTestId(PredictHomeTestIds.HOME_SPORTS_HEADER),
    ).toBeOnTheScreen();
    const skeletons = within(
      screen.getByTestId(PredictHomeTestIds.HOME_SPORTS_ROW),
    ).getAllByTestId(PredictHomeTestIds.HOME_SPORTS_SKELETON);
    expect(skeletons.length).toBeGreaterThan(0);
    skeletons.forEach((skeleton) =>
      expect(skeleton).toHaveStyle({ width: 190, height: 134 }),
    );
  });
});
