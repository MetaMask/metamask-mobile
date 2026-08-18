import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../types';
import { EventCard } from './EventCard';

const outcome = (side: 'yes' | 'no', askPrice?: string): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: askPrice as PredictDecimal | undefined,
});

const market = (): PredictMarket => ({
  id: 'market-1' as PredictEntityId,
  question: 'Question',
  status: 'active',
  outcomes: [outcome('yes'), outcome('no')],
});

const event = (): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  markets: [market()],
});

describe('EventCard primitives', () => {
  it('composes header content', () => {
    render(
      <EventCard.Header>
        <EventCard.Image
          source="https://example.com/event.png"
          testID="event-image"
        />
        <EventCard.Title>Election winner</EventCard.Title>
      </EventCard.Header>,
    );

    expect(screen.getByTestId('event-image')).toBeOnTheScreen();
    expect(screen.getByText('Election winner')).toBeOnTheScreen();
  });

  it('composes footer metadata and its action', () => {
    const onPress = jest.fn();
    render(
      <EventCard.Footer>
        <EventCard.FooterLeading>
          <EventCard.MetadataTag>Politics</EventCard.MetadataTag>
          <EventCard.Volume value="1500000" />
        </EventCard.FooterLeading>
        <EventCard.MoreMarkets count={2} onPress={onPress} />
      </EventCard.Footer>,
    );

    expect(screen.getByText('Politics')).toBeOnTheScreen();
    expect(screen.getByText('$1.5M Vol')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('+2 more'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('omits absent volume and an empty market action', () => {
    render(
      <EventCard.Footer>
        <EventCard.FooterLeading>
          <EventCard.Volume />
        </EventCard.FooterLeading>
        <EventCard.MoreMarkets count={0} />
      </EventCard.Footer>,
    );

    expect(screen.queryByText(/ Vol$/)).toBeNull();
    expect(screen.queryByText(/more$/)).toBeNull();
  });
});

describe('EventCard.OutcomeRow', () => {
  const renderRow = (
    askPrice?: string,
    color: 'green' | 'indigo' | 'red' = 'green',
    onOrder?: () => void,
  ) => {
    const value = event();
    const valueOutcome = outcome('yes', askPrice);

    render(
      <EventCard.OutcomeRow
        event={value}
        market={value.markets[0]}
        outcome={valueOutcome}
        color={color}
        onOrder={onOrder}
        testID="predict-next-outcome-event-1-yes"
      />,
    );

    return { value, valueOutcome };
  };

  it('shows the outcome label, multiplier, Ask Price, and chance', () => {
    renderRow('0.42');

    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('2.38x')).toBeOnTheScreen();
    expect(screen.getByText('42¢')).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ width: '42%' });
  });

  it('uses the selected outcome color', () => {
    renderRow('0.5', 'red');

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.error.default });
  });

  it('omits the chance and multiplier when Ask Price is missing', () => {
    renderRow();

    expect(
      screen.queryByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toBeNull();
    expect(screen.queryByText(/x$/)).toBeNull();
  });

  it('emits the selected Event, Market, and Outcome', () => {
    const onOrder = jest.fn();
    const { value, valueOutcome } = renderRow('0.42', 'green', onOrder);

    fireEvent.press(screen.getByTestId('predict-next-outcome-event-1-yes'));

    expect(onOrder).toHaveBeenCalledWith(value, value.markets[0], valueOutcome);
  });
});
