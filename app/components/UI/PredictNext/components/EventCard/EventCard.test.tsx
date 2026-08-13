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

describe('EventCard.Header', () => {
  it('shows the event title', () => {
    render(<EventCard.Header event={event()} />);

    expect(screen.getByText('Election winner')).toBeOnTheScreen();
  });

  it('shows the event image when an image URL is present', () => {
    render(
      <EventCard.Header
        event={event({ imageUrl: 'https://example.com/event.png' })}
      />,
    );

    expect(
      screen.getByTestId('predict-next-event-image-event-1'),
    ).toBeOnTheScreen();
  });

  it('omits the image when the event has no image URL', () => {
    render(<EventCard.Header event={event()} />);

    expect(screen.queryByTestId('predict-next-event-image-event-1')).toBeNull();
  });
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

describe('EventCard.OutcomeRow', () => {
  const renderRow = (
    askPrice?: string,
    color: 'green' | 'indigo' | 'red' = 'green',
    onOrder?: () => void,
  ) => {
    const value = event();

    render(
      <EventCard.OutcomeRow
        event={value}
        market={value.markets[0]}
        outcome={outcome('yes', askPrice)}
        color={color}
        onOrder={onOrder}
        testID="predict-next-outcome-event-1-yes"
      />,
    );

    return value;
  };

  it('shows the outcome label, multiplier, and Ask Price', () => {
    renderRow('0.42');

    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('2.38x')).toBeOnTheScreen();
    expect(screen.getByText('42¢')).toBeOnTheScreen();
  });

  it('sizes the chance line from the Ask Price', () => {
    renderRow('0.42');

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ width: '42%' });
  });

  it('uses a compact price button width', () => {
    renderRow('0.42');

    expect(screen.getByTestId('predict-next-outcome-event-1-yes')).toHaveStyle({
      width: 56,
    });
  });

  it('paints the chance line with the outcome color', () => {
    renderRow('0.5', 'red');

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.error.default });
  });

  it('omits the chance line and multiplier when Ask Price is missing', () => {
    renderRow();

    expect(
      screen.queryByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toBeNull();
    expect(screen.queryByText(/x$/)).toBeNull();
  });

  it('calls onOrder when the price control is pressed', () => {
    const onOrder = jest.fn();
    const value = renderRow('0.42', 'green', onOrder);

    fireEvent.press(screen.getByTestId('predict-next-outcome-event-1-yes'));

    expect(onOrder).toHaveBeenCalledWith(
      value,
      value.markets[0],
      outcome('yes', '0.42'),
    );
  });
});
