// Renders every cell at once. The real list measures itself first and
// re-renders outside act().
jest.mock(
  '@shopify/flash-list',
  () =>
    jest.requireActual('./testUtils/flashListRenderAll').flashListRenderAllMock,
);

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { makePredictNextGameEvent } from '../../../../../../../tests/component-view/fixtures/predictNext';
import type { PredictEntityId, PredictEvent } from '../../../types';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { HomeTrendingSection } from './HomeTrendingSection';

const GAMES = [
  makePredictNextGameEvent('nfl-1', 'Packers', 'Steelers', 'NFL'),
  makePredictNextGameEvent('nfl-2', 'Panthers', 'Cardinals', 'NFL'),
  makePredictNextGameEvent('ncaa-1', 'Pittsburgh', 'Miami', 'NCAAF'),
];

const makeThreeWayGameEvent = (): PredictEvent => {
  const base = makePredictNextGameEvent('epl-1', 'Arsenal', 'Chelsea', 'EPL');
  const drawBase = base.markets[0];
  const [yesOutcome, noOutcome] = drawBase.outcomes;
  return {
    ...base,
    markets: [
      ...base.markets,
      {
        ...drawBase,
        id: 'epl-1-draw-market' as PredictEntityId,
        outcomes: [
          {
            ...yesOutcome,
            id: 'epl-1-draw-yes' as PredictEntityId,
            label: 'Draw',
            askPrice: '0.25' as typeof yesOutcome.askPrice,
            gameSelection: 'draw' as const,
          },
          {
            ...noOutcome,
            id: 'epl-1-draw-no' as PredictEntityId,
          },
        ] as const,
      },
    ],
  };
};

// The pagination row is hidden from screen readers.
const HIDDEN = { includeHiddenElements: true };

const renderSection = (
  props: Partial<React.ComponentProps<typeof HomeTrendingSection>> = {},
) =>
  render(
    <HomeTrendingSection
      events={GAMES}
      isLoading={false}
      onOpen={jest.fn()}
      onOpenEvent={jest.fn()}
      onOrder={jest.fn()}
      {...props}
    />,
  );

const carousel = () =>
  within(screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_CAROUSEL));

describe('HomeTrendingSection', () => {
  it('opens the Trending screen from the header and its chevron', () => {
    const onOpen = jest.fn();
    renderSection({ onOpen });

    const header = screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER);
    expect(header).toHaveTextContent('Trending');
    expect(
      within(header).getByTestId(PredictHomeTestIds.HOME_TRENDING_CHEVRON),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Trending' })).toBeOnTheScreen();

    fireEvent.press(header);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a plain header with no chevron when there is no Trending screen', () => {
    renderSection({ onOpen: undefined });

    const header = screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER);
    expect(header).toHaveTextContent('Trending');
    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_CHEVRON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Trending' }),
    ).not.toBeOnTheScreen();
  });

  it('shows a featured card per Event, in order, in a 340pt carousel', () => {
    renderSection();

    expect(
      carousel()
        .getAllByTestId(/^predict-next-event-kalshi-/)
        .map((card) => card.props.testID),
    ).toEqual(GAMES.map(({ id }) => PredictHomeTestIds.event('kalshi', id)));
    // The featured composition: stacked Team rows with percentage pills.
    expect(
      carousel().getByTestId('predict-next-game-team-nfl-1-away'),
    ).toBeOnTheScreen();
    expect(
      carousel().getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
    ).toHaveTextContent('42%');
    const lastSlotStyle = StyleSheet.flatten(
      screen.getByTestId(`${PredictHomeTestIds.HOME_TRENDING}-card-2`).props
        .style,
    );
    expect(lastSlotStyle).toMatchObject({ width: 340 });
    expect(lastSlotStyle.minHeight).toBeUndefined();
    expect(lastSlotStyle.height).toBeUndefined();
  });

  it('renders a 3-way Draw game card in Trending without fixed slot height', () => {
    const threeWayGame = makeThreeWayGameEvent();

    renderSection({ events: [threeWayGame, ...GAMES] });

    expect(
      carousel().getByTestId('predict-next-game-team-epl-1-away'),
    ).toBeOnTheScreen();
    expect(
      carousel().getByTestId('predict-next-game-team-epl-1-draw'),
    ).toBeOnTheScreen();
    expect(
      carousel().getByTestId('predict-next-game-team-epl-1-home'),
    ).toBeOnTheScreen();
    expect(
      carousel().getByTestId('predict-next-game-quote-epl-1-draw'),
    ).toHaveTextContent('25%');
    const slotStyle = StyleSheet.flatten(
      screen.getByTestId(`${PredictHomeTestIds.HOME_TRENDING}-card-0`).props
        .style,
    );
    expect(slotStyle).toMatchObject({ width: 340 + 12 });
    expect(slotStyle.minHeight).toBeUndefined();
    expect(slotStyle.height).toBeUndefined();
  });

  it('spans the screen edge to edge and keeps the header padded', () => {
    renderSection();

    expect(screen.getByTestId(PredictHomeTestIds.HOME_TRENDING)).toHaveStyle({
      marginLeft: -16,
      marginRight: -16,
    });
    expect(
      screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
    ).toHaveStyle({ paddingLeft: 16, paddingRight: 16 });
  });

  it('shows one pagination dot per card, the first one active', () => {
    renderSection();

    const pagination = screen.getByTestId(
      PredictHomeTestIds.HOME_TRENDING_PAGINATION,
      HIDDEN,
    );
    expect(pagination.children).toHaveLength(GAMES.length);
    expect(
      screen.getByTestId(
        `${PredictHomeTestIds.HOME_TRENDING_PAGINATION}-active`,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
  });

  it('shows no pagination for a single card', () => {
    renderSection({ events: GAMES.slice(0, 1) });

    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('opens the pressed Event', () => {
    const onOpenEvent = jest.fn();
    renderSection({ onOpenEvent });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.eventContent('kalshi', 'nfl-2')),
    );

    expect(onOpenEvent).toHaveBeenCalledTimes(1);
    expect(onOpenEvent).toHaveBeenCalledWith(GAMES[1]);
  });

  it('opens an Order from a card quote', () => {
    const onOrder = jest.fn();
    renderSection({ onOrder });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'home')),
    );

    expect(onOrder).toHaveBeenCalledTimes(1);
    expect(onOrder).toHaveBeenCalledWith(
      GAMES[0],
      GAMES[0].markets[1],
      GAMES[0].markets[1].outcomes[0],
    );
  });

  it('renders nothing once loaded without an Event', () => {
    renderSection({ events: [] });

    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
    ).not.toBeOnTheScreen();
  });

  it('shows 340x268 skeleton cards and no pagination while loading', () => {
    renderSection({ events: [], isLoading: true });

    expect(
      screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
    ).toBeOnTheScreen();
    const skeletons = screen.getAllByTestId(
      PredictHomeTestIds.HOME_TRENDING_SKELETON,
    );
    expect(skeletons.length).toBeGreaterThan(0);
    skeletons.forEach((skeleton) =>
      expect(skeleton).toHaveStyle({ width: 340, height: 268 }),
    );
    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('replaces skeletons with loaded cards and pagination once loading completes', () => {
    const { rerender } = renderSection({ events: [], isLoading: true });

    expect(
      screen.getAllByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN),
    ).not.toBeOnTheScreen();

    rerender(
      <HomeTrendingSection
        events={GAMES}
        isLoading={false}
        onOpen={jest.fn()}
        onOpenEvent={jest.fn()}
        onOrder={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON),
    ).not.toBeOnTheScreen();
    expect(
      carousel().getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN),
    ).toBeOnTheScreen();
  });
});
