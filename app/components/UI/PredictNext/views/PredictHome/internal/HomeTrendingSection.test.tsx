// Renders every cell at once, as Carousel.test.tsx does. The real list
// measures itself first and re-renders outside act().
jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement, Fragment } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    FlashList: (props: {
      data: unknown[];
      testID: string;
      keyExtractor: (item: unknown, index: number) => string;
      renderItem: (info: {
        item: unknown;
        index: number;
        target: string;
      }) => unknown;
    }) =>
      createElement(
        View,
        { testID: props.testID },
        props.data.map((item, index) =>
          createElement(
            Fragment,
            { key: props.keyExtractor(item, index) },
            props.renderItem({ item, index, target: 'Cell' }),
          ),
        ),
      ),
  };
});

import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { makePredictNextGameEvent } from '../../../../../../../tests/component-view/fixtures/predictNext';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { HomeTrendingSection } from './HomeTrendingSection';

const GAMES = [
  makePredictNextGameEvent('nfl-1', 'Packers', 'Steelers', 'NFL'),
  makePredictNextGameEvent('nfl-2', 'Panthers', 'Cardinals', 'NFL'),
  makePredictNextGameEvent('ncaa-1', 'Pittsburgh', 'Miami', 'NCAAF'),
];

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
    // The featured composition: both Teams around the score, then an
    // "ABBR · price" pill per Team.
    expect(
      carousel().getByTestId('predict-next-game-matchup-nfl-1'),
    ).toBeOnTheScreen();
    expect(
      carousel().getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
    ).toHaveTextContent(/^PAC\s*· 42¢$/);
    expect(
      StyleSheet.flatten(
        screen.getByTestId(`${PredictHomeTestIds.HOME_TRENDING}-card-2`).props
          .style,
      ),
    ).toMatchObject({ width: 340 });
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

  it('shows 340x220 skeleton cards and no pagination while loading', () => {
    renderSection({ events: [], isLoading: true });

    expect(
      screen.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
    ).toBeOnTheScreen();
    const skeletons = screen.getAllByTestId(
      PredictHomeTestIds.HOME_TRENDING_SKELETON,
    );
    expect(skeletons.length).toBeGreaterThan(0);
    skeletons.forEach((skeleton) =>
      expect(skeleton).toHaveStyle({ width: 340, height: 220 }),
    );
    expect(
      screen.queryByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN),
    ).not.toBeOnTheScreen();
  });
});
