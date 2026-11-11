import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { EventCardStandard } from './EventCardStandard';

const IMAGE_URL = 'https://example.com/event.png';

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

const market = (
  id: string,
  askPrice = '0.42',
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Question ${id}`,
  status: 'active',
  outcomes: [
    outcome('yes', askPrice, `Candidate ${id}`),
    outcome('no', '0.58'),
  ],
  ...overrides,
});

const event = (
  markets: PredictMarket[],
  overrides: Partial<PredictEvent> = {},
): PredictEvent => ({
  id: 'event-1' as PredictEntityId,
  venueId: 'kalshi' as PredictVenueId,
  title: 'Election winner',
  closesAt: '2028-07-15T12:00:00Z' as PredictTimestamp,
  volume: '4200000',
  category: 'Politics',
  imageUrl: IMAGE_URL,
  markets,
  ...overrides,
});

const threeMarkets = () => [
  market('market-1', '0.31'),
  market('market-2', '0.24'),
  market('market-3', '0.18'),
  market('market-4', '0.1'),
];

describe('EventCardStandard', () => {
  describe('binary Event', () => {
    it('shows the title, the close date and volume line, and Yes and No rows', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(screen.getByText('Election winner')).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-event-subtitle-event-1'),
      ).toHaveTextContent('Closes Jul 2028 · $4.2M');
      expect(screen.getByText('Yes')).toBeOnTheScreen();
      expect(screen.getByText('42¢')).toBeOnTheScreen();
      expect(screen.getByText('No')).toBeOnTheScreen();
      expect(screen.getByText('58¢')).toBeOnTheScreen();
    });

    it('repeats the Event image as each row avatar', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-outcome-event-1-yes-avatar-image'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-outcome-event-1-no-avatar-image'),
      ).toBeOnTheScreen();
    });

    it('draws neutral quote bars sized to each price', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-outcome-event-1-yes-bar'),
      ).toHaveStyle({
        width: '42%',
        backgroundColor: lightTheme.colors.icon.alternative,
      });
      expect(
        screen.getByTestId('predict-next-outcome-event-1-no-bar'),
      ).toHaveStyle({
        width: '58%',
        backgroundColor: lightTheme.colors.icon.alternative,
      });
    });

    it('has no image beside the title, no footer and no multiplier', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.queryByTestId('predict-next-event-image-event-1'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-event-footer-kalshi-event-1'),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText('Politics')).not.toBeOnTheScreen();
      expect(screen.queryByText(/Vol$/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/x$/)).not.toBeOnTheScreen();
    });
  });

  describe('multi-market Event', () => {
    it('shows the Yes row of the first three Markets only', () => {
      render(
        <EventCardStandard event={event(threeMarkets())} onPress={jest.fn()} />,
      );

      expect(screen.getByText('Candidate market-1')).toBeOnTheScreen();
      expect(screen.getByText('Candidate market-2')).toBeOnTheScreen();
      expect(screen.getByText('Candidate market-3')).toBeOnTheScreen();
      expect(screen.queryByText('Candidate market-4')).not.toBeOnTheScreen();
      expect(screen.getByText('31¢')).toBeOnTheScreen();
      expect(screen.getByText('24¢')).toBeOnTheScreen();
      expect(screen.getByText('18¢')).toBeOnTheScreen();
      expect(screen.queryByText('Question market-1')).not.toBeOnTheScreen();
    });

    it('has no hidden Market count', () => {
      render(
        <EventCardStandard event={event(threeMarkets())} onPress={jest.fn()} />,
      );

      expect(screen.queryByText(/more$/)).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-event-more-event-1'),
      ).not.toBeOnTheScreen();
    });

    it('uses the same neutral bar on every row', () => {
      render(
        <EventCardStandard event={event(threeMarkets())} onPress={jest.fn()} />,
      );

      ['market-1', 'market-2', 'market-3'].forEach((id) => {
        expect(
          screen.getByTestId(`predict-next-outcome-event-1-${id}-yes-bar`),
        ).toHaveStyle({ backgroundColor: lightTheme.colors.icon.alternative });
      });
    });

    it('falls back to the Event image for every row avatar', () => {
      render(
        <EventCardStandard event={event(threeMarkets())} onPress={jest.fn()} />,
      );

      ['market-1', 'market-2', 'market-3'].forEach((id) => {
        expect(
          screen.getByTestId(
            `predict-next-outcome-event-1-${id}-yes-avatar-image`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('shows a placeholder avatar when the Event has no image', () => {
      render(
        <EventCardStandard
          event={event(threeMarkets(), { imageUrl: undefined })}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-outcome-event-1-market-1-yes-avatar'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          'predict-next-outcome-event-1-market-1-yes-avatar-image',
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('subtitle', () => {
    it('shows only the volume when the close date is missing', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')], { closesAt: undefined })}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-event-subtitle-event-1'),
      ).toHaveTextContent('$4.2M');
    });

    it('omits the line when close date and volume are both missing', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')], {
            closesAt: undefined,
            volume: undefined,
          })}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.queryByTestId('predict-next-event-subtitle-event-1'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('actions', () => {
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
      fireEvent.press(screen.getByTestId('predict-next-outcome-event-1-no'));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onOrder).toHaveBeenCalledTimes(1);
      expect(onOrder).toHaveBeenCalledWith(
        value,
        value.markets[0],
        value.markets[0].outcomes[1],
      );
    });

    it('orders the Yes Outcome of the tapped Market', () => {
      const onOrder = jest.fn();
      const value = event(threeMarkets());

      render(
        <EventCardStandard
          event={value}
          onPress={jest.fn()}
          onOrder={onOrder}
        />,
      );
      fireEvent.press(
        screen.getByTestId('predict-next-outcome-event-1-market-2-yes'),
      );

      expect(onOrder).toHaveBeenCalledWith(
        value,
        value.markets[1],
        value.markets[1].outcomes[0],
      );
    });

    it('disables the price of an Outcome that is not tradeable', () => {
      const onOrder = jest.fn();

      render(
        <EventCardStandard
          event={event([
            market('market-1', '0.31', { status: 'closed' }),
            market('market-2', '0.24'),
          ])}
          onPress={jest.fn()}
          onOrder={onOrder}
        />,
      );

      expect(
        screen.getByTestId('predict-next-outcome-event-1-market-1-yes'),
      ).toBeDisabled();
      expect(
        screen.getByTestId('predict-next-outcome-event-1-market-2-yes'),
      ).toBeEnabled();
    });
  });
});
