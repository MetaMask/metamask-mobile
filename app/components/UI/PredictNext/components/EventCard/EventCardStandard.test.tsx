import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../types';
import { EventCardStandard } from './EventCardStandard';

const outcome = (side: 'yes' | 'no', askPrice?: string): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: askPrice as PredictDecimal | undefined,
});

const market = (id: string, askPrice = '0.42'): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Question ${id}`,
  status: 'open',
  outcomes: [outcome('yes', askPrice), outcome('no', '0.58')],
});

const event = (
  markets: PredictMarket[],
  overrides: Partial<PredictEvent> = {},
): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  markets,
  ...overrides,
});

describe('EventCardStandard', () => {
  it('shows the title and image when an image URL is present', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')], {
          imageUrl: 'https://example.com/event.png',
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Election winner')).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-event-image-event-1'),
    ).toBeOnTheScreen();
  });

  it('omits the image when the event has no image URL', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Election winner')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-next-event-image-event-1')).toBeNull();
  });

  it('shows Yes and No controls for one Market', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Yes 42¢')).toBeOnTheScreen();
    expect(screen.getByText('No 58¢')).toBeOnTheScreen();
  });

  it('keeps card navigation independent from an Outcome action', () => {
    const onPress = jest.fn();
    const onOrder = jest.fn();
    const value = event([market('market-1')]);

    render(
      <EventCardStandard event={value} onPress={onPress} onOrder={onOrder} />,
    );
    fireEvent.press(
      screen.getByTestId('predict-next-event-content-kalshi-event-1'),
    );
    fireEvent.press(screen.getByTestId('predict-next-outcome-event-1-yes'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onOrder).toHaveBeenCalledWith(
      value,
      value.markets[0],
      value.markets[0].outcomes[0],
    );
  });
});
