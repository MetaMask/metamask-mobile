import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../types';
import { EventCard } from './EventCard';

const outcome = (side: 'yes' | 'no'): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
});

const market = (id: string): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Question ${id}`,
  status: 'open',
  outcomes: [outcome('yes'), outcome('no')],
});

const event = (overrides: Partial<PredictEvent> = {}): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  markets: [market('market-1')],
  ...overrides,
});

describe('EventCard.Footer', () => {
  it('shows the category tag from the event', () => {
    render(<EventCard.Footer event={event({ category: 'Senate' })} />);

    expect(screen.getByText('Senate')).toBeOnTheScreen();
  });

  it('shows formatted volume from the event', () => {
    render(<EventCard.Footer event={event({ volume: '1500000' })} />);

    expect(screen.getByText('$1.5M Vol')).toBeOnTheScreen();
  });

  it('shows the hidden market count when more than three markets exist', () => {
    render(
      <EventCard.Footer
        event={event({
          markets: [
            market('market-1'),
            market('market-2'),
            market('market-3'),
            market('market-4'),
            market('market-5'),
          ],
        })}
      />,
    );

    expect(screen.getByLabelText('+2 more')).toBeOnTheScreen();
  });

  it('omits the hidden market count for a binary event', () => {
    render(
      <EventCard.Footer event={event({ category: 'Crypto', volume: '500' })} />,
    );

    expect(screen.queryByLabelText('+0 more')).toBeNull();
    expect(screen.queryByTestId('predict-next-event-more-event-1')).toBeNull();
  });

  it('omits the hidden market count when three or fewer markets exist', () => {
    render(
      <EventCard.Footer
        event={event({
          category: 'Politics',
          markets: [market('market-1'), market('market-2'), market('market-3')],
        })}
      />,
    );

    expect(screen.queryByTestId('predict-next-event-more-event-1')).toBeNull();
  });

  it('omits category and volume when those fields are missing', () => {
    render(
      <EventCard.Footer
        event={event({
          markets: [
            market('market-1'),
            market('market-2'),
            market('market-3'),
            market('market-4'),
          ],
        })}
      />,
    );

    expect(
      screen.queryByTestId('predict-next-event-category-event-1'),
    ).toBeNull();
    expect(
      screen.queryByTestId('predict-next-event-volume-event-1'),
    ).toBeNull();
    expect(screen.getByLabelText('+1 more')).toBeOnTheScreen();
  });

  it('calls onPress when the hidden market count is pressed', () => {
    const onPress = jest.fn();

    render(
      <EventCard.Footer
        event={event({
          markets: [
            market('market-1'),
            market('market-2'),
            market('market-3'),
            market('market-4'),
          ],
        })}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByTestId('predict-next-event-more-event-1'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
