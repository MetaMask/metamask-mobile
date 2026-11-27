import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  makePredictNextEvent,
  makePredictNextGameEvent,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { FeedPreviewSection } from './FeedPreviewSection';

const EVENTS = [
  makePredictNextGameEvent('game-1', 'Bills', 'Rams', 'NFL', {
    status: 'scheduled',
  }),
  makePredictNextEvent('market-1', 'Fed cuts rates in December?'),
  makePredictNextEvent('market-2', 'Bitcoin above $150k?'),
];

const renderSection = (
  props: Partial<React.ComponentProps<typeof FeedPreviewSection>> = {},
) =>
  render(
    <FeedPreviewSection
      sectionId="trending"
      title="Trending"
      limit={EVENTS.length}
      events={EVENTS}
      isLoading={false}
      isError={false}
      onOpenEvent={jest.fn()}
      onRetry={jest.fn()}
      {...props}
    />,
  );

describe('FeedPreviewSection', () => {
  it.each([1, 3, 5])(
    'shows one skeleton per card while a preview of %i loads',
    (limit) => {
      renderSection({ limit, events: [], isLoading: true });

      expect(
        screen.getAllByTestId(PredictHomeTestIds.sectionSkeleton('trending')),
      ).toHaveLength(limit);
      expect(
        screen.queryByTestId(/^predict-next-event-kalshi-/),
      ).not.toBeOnTheScreen();
    },
  );

  it('shows one card per Event, in order', () => {
    renderSection();

    expect(
      screen
        .getAllByTestId(/^predict-next-event-kalshi-/)
        .map((card) => card.props.testID),
    ).toEqual(EVENTS.map(({ id }) => PredictHomeTestIds.event('kalshi', id)));
  });

  it('shows a game Event as the featured game card and any other as the standard card', () => {
    renderSection();

    expect(
      screen.getByTestId('predict-next-game-header-game-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-outcome-market-1-yes'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-game-header-market-1'),
    ).not.toBeOnTheScreen();
  });

  it('opens the Event a card shows', () => {
    const onOpenEvent = jest.fn();
    renderSection({ onOpenEvent });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.eventContent('kalshi', 'market-2')),
    );

    expect(onOpenEvent).toHaveBeenCalledWith(EVENTS[2]);
  });

  it('keeps its error and empty states', () => {
    const onRetry = jest.fn();
    const { rerender } = renderSection({ events: [], isError: true, onRetry });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.sectionRetry('trending')),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <FeedPreviewSection
        sectionId="trending"
        title="Trending"
        limit={5}
        events={[]}
        isLoading={false}
        isError={false}
        onOpenEvent={jest.fn()}
        onRetry={onRetry}
      />,
    );
    expect(
      screen.getByTestId(PredictHomeTestIds.sectionEmpty('trending')),
    ).toBeOnTheScreen();
  });
});
