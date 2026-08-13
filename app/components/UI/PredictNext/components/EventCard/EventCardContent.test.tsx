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
import { EventCardContent } from './EventCardContent';

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

const event = (markets: PredictMarket[]): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  markets,
});

describe('EventCardContent', () => {
  it('shows Yes and No controls for one Market', () => {
    render(
      <EventCardContent
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Yes 42¢')).toBeOnTheScreen();
    expect(screen.getByText('No 58¢')).toBeOnTheScreen();
  });

  it('shows three Yes rows and the hidden count for multiple Markets', () => {
    render(
      <EventCardContent
        event={event([
          market('market-1'),
          market('market-2'),
          market('market-3'),
          market('market-4'),
          market('market-5'),
        ])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getAllByText('Yes 42¢')).toHaveLength(3);
    expect(screen.getByLabelText('+2 more')).toBeOnTheScreen();
    expect(screen.queryByText('Question market-4')).not.toBeOnTheScreen();
  });

  it('keeps Outcome controls disabled without an Order callback', () => {
    render(
      <EventCardContent
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes'),
    ).toBeDisabled();
  });

  it('keeps card navigation independent from an Outcome action', () => {
    const onPress = jest.fn();
    const onOrder = jest.fn();
    const value = event([market('market-1')]);
    render(
      <EventCardContent event={value} onPress={onPress} onOrder={onOrder} />,
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
