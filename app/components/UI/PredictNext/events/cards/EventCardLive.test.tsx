import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import { parsePredictEvent } from '../../contracts/v1/marketData';
import { EventCardLive } from './EventCardLive';

const EVENT_ID = 'KXGRAMMYAOTY-27';
const SWIFT = `${EVENT_ID}-TS`;
const EILISH = `${EVENT_ID}-BE`;
const CARPENTER = `${EVENT_ID}-SC`;

/** A nominee Market as the API sends it, named by its yes Outcome. */
const nominee = (
  ticker: string,
  name: string,
  yesAskPrice: string,
  noAskPrice: string,
) => ({
  id: ticker,
  question: `Will ${name} win Album of the Year?`,
  status: 'active',
  outcomes: [
    { id: `${ticker}:yes`, side: 'yes', label: name, askPrice: yesAskPrice },
    {
      id: `${ticker}:no`,
      side: 'no',
      label: `Not ${name}`,
      askPrice: noAskPrice,
    },
  ],
});

/** The design's Event, read through the API contract. */
const albumOfTheYear = (overrides: Record<string, unknown> = {}) =>
  parsePredictEvent({
    venueId: 'kalshi',
    id: EVENT_ID,
    title: 'Album of the Year',
    subtitle: 'Grammys · Tonight',
    category: 'Culture',
    closesAt: '2027-02-08T04:00:00Z',
    volume: '2100000',
    imageUrl: 'https://example.com/grammys.png',
    markets: [
      nominee(SWIFT, 'Taylor Swift', '0.34', '0.67'),
      nominee(EILISH, 'Billie Eilish', '0.22', '0.79'),
      nominee(CARPENTER, 'Sabrina Carpenter', '0.18', '0.83'),
    ],
    ...overrides,
  });

const rowTestId = (marketId: string) =>
  `predict-next-outcome-row-${EVENT_ID}-${marketId}`;
const priceTestId = (marketId: string) =>
  `predict-next-outcome-${EVENT_ID}-${marketId}-yes`;

const renderCard = (
  props: Partial<React.ComponentProps<typeof EventCardLive>> = {},
) =>
  render(
    <EventCardLive
      event={albumOfTheYear()}
      live
      onPress={jest.fn()}
      {...props}
    />,
  );

describe('EventCardLive', () => {
  describe('header', () => {
    it('shows the Category in caps and a LIVE marker in the success color', () => {
      renderCard();

      expect(
        screen.getByTestId(`predict-next-event-category-${EVENT_ID}`),
      ).toHaveTextContent('CULTURE');
      expect(
        screen.getByTestId(`predict-next-event-live-${EVENT_ID}`),
      ).toHaveTextContent('LIVE');
      expect(
        screen.getByTestId(`predict-next-event-live-dot-${EVENT_ID}`),
      ).toHaveStyle({
        width: 8,
        height: 8,
        backgroundColor: lightTheme.colors.success.default,
      });
      expect(screen.getByText('LIVE')).toHaveStyle({
        color: lightTheme.colors.success.default,
      });
    });

    it('draws the dashed divider below the header', () => {
      renderCard();

      expect(
        screen.getByTestId(`predict-next-event-header-${EVENT_ID}-divider`),
      ).toHaveStyle({ borderStyle: 'dashed' });
    });

    it('leaves out the LIVE marker when the Event is not live', () => {
      renderCard({ live: false });

      expect(
        screen.queryByTestId(`predict-next-event-live-${EVENT_ID}`),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText('LIVE')).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(`predict-next-event-category-${EVENT_ID}`),
      ).toHaveTextContent('CULTURE');
      expect(
        screen.getByTestId(`predict-next-event-header-${EVENT_ID}-divider`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Album of the Year')).toBeOnTheScreen();
      expect(screen.getByTestId(rowTestId(SWIFT))).toBeOnTheScreen();
      expect(screen.getByTestId(rowTestId(EILISH))).toBeOnTheScreen();
    });

    it('falls back to the title in caps without a Category', () => {
      renderCard({ event: albumOfTheYear({ category: undefined }) });

      expect(
        screen.getByTestId(`predict-next-event-category-${EVENT_ID}`),
      ).toHaveTextContent('ALBUM OF THE YEAR');
    });
  });

  describe('title', () => {
    it('shows the title and the subtitle', () => {
      renderCard();

      expect(screen.getByText('Album of the Year')).toBeOnTheScreen();
      expect(
        screen.getByTestId(`predict-next-event-subtitle-${EVENT_ID}`),
      ).toHaveTextContent('Grammys · Tonight');
    });

    it('falls back to the close date and volume without a subtitle', () => {
      renderCard({ event: albumOfTheYear({ subtitle: undefined }) });

      expect(
        screen.getByTestId(`predict-next-event-subtitle-${EVENT_ID}`),
      ).toHaveTextContent('Closes Feb 2027 · $2.1M');
    });
  });

  describe('rows', () => {
    it('shows one row per Market, two at most', () => {
      renderCard();

      expect(screen.getAllByTestId(/^predict-next-outcome-row-/)).toHaveLength(
        2,
      );
      expect(screen.getByTestId(rowTestId(SWIFT))).toBeOnTheScreen();
      expect(screen.getByTestId(rowTestId(EILISH))).toBeOnTheScreen();
      expect(screen.queryByTestId(rowTestId(CARPENTER))).not.toBeOnTheScreen();
      expect(screen.queryByText('Sabrina Carpenter')).not.toBeOnTheScreen();
    });

    it('names each row by its yes Outcome, then a placeholder rank and its price', () => {
      renderCard();

      const first = within(screen.getByTestId(rowTestId(SWIFT)));
      expect(first.getByText('Taylor Swift')).toBeOnTheScreen();
      expect(first.getByText('Leads')).toBeOnTheScreen();
      expect(first.getByText('34¢')).toBeOnTheScreen();

      const second = within(screen.getByTestId(rowTestId(EILISH)));
      expect(second.getByText('Billie Eilish')).toBeOnTheScreen();
      expect(second.getByText('Second')).toBeOnTheScreen();
      expect(second.getByText('22¢')).toBeOnTheScreen();

      expect(
        screen.queryByText('Will Taylor Swift win Album of the Year?'),
      ).not.toBeOnTheScreen();
    });

    it('prices each row in a 64x37 pill', () => {
      renderCard();

      expect(screen.getByTestId(priceTestId(SWIFT))).toHaveStyle({
        height: 37,
        minWidth: 64,
      });
    });

    it('has no avatar and no price bar', () => {
      renderCard();

      const hidden = { includeHiddenElements: true };
      expect(screen.queryAllByTestId(/avatar/, hidden)).toHaveLength(0);
      expect(screen.queryAllByTestId(/-bar$/, hidden)).toHaveLength(0);
    });

    it('skips a Market without a yes Outcome', () => {
      const event = albumOfTheYear();
      const [swift, ...others] = event.markets;
      const [, no] = swift.outcomes;

      renderCard({
        event: {
          ...event,
          markets: [{ ...swift, outcomes: [no, no] }, ...others],
        },
      });

      expect(screen.queryByTestId(rowTestId(SWIFT))).not.toBeOnTheScreen();
      expect(
        within(screen.getByTestId(rowTestId(EILISH))).getByText('Leads'),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByTestId(rowTestId(CARPENTER))).getByText('Second'),
      ).toBeOnTheScreen();
    });
  });

  describe('actions', () => {
    it('orders the yes Outcome of the tapped row', () => {
      const onOrder = jest.fn();
      const event = albumOfTheYear();

      renderCard({ event, onOrder });
      fireEvent.press(screen.getByTestId(priceTestId(EILISH)));

      expect(onOrder).toHaveBeenCalledTimes(1);
      expect(onOrder).toHaveBeenCalledWith(
        event,
        event.markets[1],
        event.markets[1].outcomes[0],
      );
    });

    it('opens the Event from the title without ordering', () => {
      const onPress = jest.fn();
      const onOrder = jest.fn();

      renderCard({ onPress, onOrder });
      fireEvent.press(
        screen.getByTestId(`predict-next-event-content-kalshi-${EVENT_ID}`),
      );

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onOrder).not.toHaveBeenCalled();
    });

    it('disables the price of a Market that is not tradeable', () => {
      const event = albumOfTheYear();
      const [swift, ...others] = event.markets;

      renderCard({
        event: {
          ...event,
          markets: [{ ...swift, status: 'closed' }, ...others],
        },
        onOrder: jest.fn(),
      });

      expect(screen.getByTestId(priceTestId(SWIFT))).toBeDisabled();
      expect(screen.getByTestId(priceTestId(EILISH))).toBeEnabled();
    });

    it('disables every price without an order handler', () => {
      renderCard();

      expect(screen.getByTestId(priceTestId(SWIFT))).toBeDisabled();
      expect(screen.getByTestId(priceTestId(EILISH))).toBeDisabled();
    });
  });
});
