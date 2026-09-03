import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictHttpsUrl,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { PredictEventCard } from './PredictEventCard';

const gameEvent = (
  sportId: string,
  overrides: Partial<PredictEvent> = {},
): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'routed-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  sports: {
    sport: {
      id: sportId as PredictEntityId,
      label: sportId,
    },
    game: {
      status: 'in_progress',
      awayTeam: { name: 'Arizona Cardinals', abbreviation: 'ARI' },
      homeTeam: { name: 'Carolina Panthers', abbreviation: 'CAR' },
      score: { away: '17', home: '21' },
      observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
    },
  },
  markets: [
    {
      id: 'away-market' as PredictEntityId,
      question: 'Away',
      status: 'active',
      outcomes: [
        {
          id: 'away-yes' as PredictEntityId,
          side: 'yes',
          label: 'Away',
          askPrice: '0.47' as PredictDecimal,
          gameSelection: 'away',
        },
        {
          id: 'away-no' as PredictEntityId,
          side: 'no',
          label: 'No',
        },
      ],
    },
  ],
  ...overrides,
});

const standardEvent = (): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'routed-event' as PredictEntityId,
  title: 'Election winner',
  imageUrl: 'https://example.com/event.png' as PredictHttpsUrl,
  markets: [
    {
      id: 'market-1' as PredictEntityId,
      question: 'Will it happen?',
      status: 'active',
      outcomes: [
        {
          id: 'yes' as PredictEntityId,
          side: 'yes',
          label: 'Yes',
          askPrice: '0.42' as PredictDecimal,
        },
        {
          id: 'no' as PredictEntityId,
          side: 'no',
          label: 'No',
          askPrice: '0.58' as PredictDecimal,
        },
      ],
    },
  ],
});

describe('PredictEventCard', () => {
  it('uses the Game card for any Event with a Game snapshot', () => {
    render(
      <PredictEventCard event={gameEvent('basketball')} onPress={jest.fn()} />,
    );

    expect(
      screen.getByTestId('predict-next-game-team-routed-event-away'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-event-image-routed-event'),
    ).not.toBeOnTheScreen();
  });

  it('uses the standard card when Sports metadata has no Game', () => {
    render(
      <PredictEventCard
        event={gameEvent('american-football', {
          sports: {
            sport: {
              id: 'american-football' as PredictEntityId,
              label: 'American football',
            },
          },
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Cardinals vs Panthers')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-game-team-routed-event-away'),
    ).not.toBeOnTheScreen();
  });

  it('uses the standard card for Events without Sports metadata', () => {
    const onPress = jest.fn();

    render(<PredictEventCard event={standardEvent()} onPress={onPress} />);
    fireEvent.press(
      screen.getByTestId('predict-next-event-content-kalshi-routed-event'),
    );

    expect(
      screen.getByTestId('predict-next-event-image-routed-event'),
    ).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
