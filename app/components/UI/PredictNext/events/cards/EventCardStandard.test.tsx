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
import { EventCardStandard } from './EventCardStandard';

const outcome = (
  side: 'yes' | 'no',
  askPrice?: string,
  label?: string,
): PredictOutcome => ({
  id: `${side}-outcome` as PredictEntityId,
  side,
  label: label ?? (side === 'yes' ? 'Yes' : 'No'),
  askPrice: askPrice as PredictDecimal | undefined,
});

const market = (id: string, askPrice = '0.42'): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Question ${id}`,
  status: 'active',
  outcomes: [
    outcome('yes', askPrice, `Candidate ${id}`),
    outcome('no', '0.58'),
  ],
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

  it('shows Yes and No rows for one Market', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('42¢')).toBeOnTheScreen();
    expect(screen.getByText('No')).toBeOnTheScreen();
    expect(screen.getByText('58¢')).toBeOnTheScreen();
  });

  it('omits the hidden market count for a single-market Event', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('predict-next-event-more-event-1')).toBeNull();
  });

  it('paints binary rows green and red', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')])}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.success.default });
    expect(
      screen.getByTestId('predict-next-outcome-event-1-no-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.error.default });
  });

  it('shows three market rows with green, indigo, and red', () => {
    render(
      <EventCardStandard
        event={event([
          market('market-1'),
          market('market-2', '0.5'),
          market('market-3', '0.2'),
          market('market-4'),
        ])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Candidate market-1')).toBeOnTheScreen();
    expect(screen.getByText('Candidate market-2')).toBeOnTheScreen();
    expect(screen.getByText('Candidate market-3')).toBeOnTheScreen();
    expect(screen.queryByText('Candidate market-4')).toBeNull();
    expect(screen.getByLabelText('+1 more')).toBeOnTheScreen();
    expect(screen.queryByText('Question market-1')).toBeNull();
    expect(
      screen.getByTestId('predict-next-outcome-event-1-market-1-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.success.default });
    expect(
      screen.getByTestId('predict-next-outcome-event-1-market-2-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.info.default });
    expect(
      screen.getByTestId('predict-next-outcome-event-1-market-3-yes-bar'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.error.default });
  });

  it('omits the hidden market count when three markets fit', () => {
    render(
      <EventCardStandard
        event={event([
          market('market-1'),
          market('market-2'),
          market('market-3'),
        ])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('predict-next-event-more-event-1')).toBeNull();
  });

  it('renders category and volume in the composed footer', () => {
    render(
      <EventCardStandard
        event={event([market('market-1')], {
          category: 'Politics',
          volume: '1500000',
        })}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('predict-next-event-category-event-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-event-volume-event-1'),
    ).toHaveTextContent('$1.5M Vol');
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
