import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import { parsePredictEvent } from '../../contracts/v1/marketData';
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
import { isEventLive } from './internal/isEventLive';

jest.mock('./internal/isEventLive', () => {
  const actual = jest.requireActual('./internal/isEventLive');
  return { isEventLive: jest.fn(actual.isEventLive) };
});

const mockIsEventLive = jest.mocked(isEventLive);
const { isEventLive: actualIsEventLive } = jest.requireActual<
  typeof import('./internal/isEventLive')
>('./internal/isEventLive');

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
  describe('container', () => {
    it('uses the elevated1 surface, 20pt radius, muted border, and default padding', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-event-kalshi-event-1'),
      ).toHaveStyle({
        backgroundColor: lightTheme.colors.background.elevated1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: lightTheme.colors.border.muted,
        paddingTop: 12,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
      });
    });

    it('uses dark theme elevated1 surface and muted border in dark mode', () => {
      render(
        <ThemeProvider theme={Theme.Dark}>
          <EventCardStandard
            event={event([market('market-1')])}
            onPress={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(
        screen.getByTestId('predict-next-event-kalshi-event-1'),
      ).toHaveStyle({
        backgroundColor: darkTheme.colors.background.elevated1,
        borderColor: darkTheme.colors.border.muted,
      });
    });
  });

  describe('binary Event', () => {
    it('shows the title, the close date and volume line, and Yes and No rows with percentage odds', () => {
      render(
        <EventCardStandard
          event={event([market('market-1')])}
          onPress={jest.fn()}
        />,
      );

      expect(screen.getByText('Election winner')).toHaveStyle({
        fontSize: 14,
        lineHeight: 22,
      });
      expect(
        screen.getByTestId('predict-next-event-subtitle-event-1'),
      ).toHaveTextContent('Closes Jul 2028 · $4.2M');
      expect(
        screen.getByTestId('predict-next-event-subtitle-event-1'),
      ).toHaveStyle({
        fontSize: 12,
        lineHeight: 20,
        color: lightTheme.colors.text.alternative,
      });
      expect(screen.getByText('Yes')).toHaveStyle({
        fontSize: 14,
        lineHeight: 22,
      });
      expect(screen.getByText('42%')).toBeOnTheScreen();
      expect(screen.getByText('No')).toHaveStyle({
        fontSize: 14,
        lineHeight: 22,
      });
      expect(screen.getByText('58%')).toBeOnTheScreen();
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
      expect(screen.getByText('31%')).toBeOnTheScreen();
      expect(screen.getByText('24%')).toBeOnTheScreen();
      expect(screen.getByText('18%')).toBeOnTheScreen();
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

describe('EventCardStandard variants', () => {
  it.each([undefined, 'default'] as const)(
    'renders the default card for the %s variant',
    (variant) => {
      render(
        <EventCardStandard
          event={event(threeMarkets())}
          variant={variant}
          onPress={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('predict-next-outcome-event-1-market-1-yes-avatar'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-outcome-event-1-market-3-yes'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-event-header-event-1'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-event-category-event-1'),
      ).not.toBeOnTheScreen();
    },
  );
});

describe('EventCardStandard trending', () => {
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
  const liveTestId = `predict-next-event-live-${EVENT_ID}`;

  const renderCard = (
    props: Partial<React.ComponentProps<typeof EventCardStandard>> = {},
  ) =>
    render(
      <EventCardStandard
        event={albumOfTheYear()}
        variant="trending"
        onPress={jest.fn()}
        {...props}
      />,
    );

  beforeEach(() => {
    mockIsEventLive.mockImplementation(actualIsEventLive);
  });

  describe('container', () => {
    it('uses the elevated1 surface, 20pt radius, muted border, and 16pt vertical padding with no horizontal padding', () => {
      renderCard();

      const card = screen.getByTestId(`predict-next-event-kalshi-${EVENT_ID}`);
      const style = StyleSheet.flatten(card.props.style);
      expect(style).toMatchObject({
        backgroundColor: lightTheme.colors.background.elevated1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: lightTheme.colors.border.muted,
        paddingTop: 16,
        paddingBottom: 16,
      });
      expect(style.paddingLeft).toBeUndefined();
      expect(style.paddingRight).toBeUndefined();
    });

    it('uses dark theme elevated1 surface and muted border in dark mode', () => {
      render(
        <ThemeProvider theme={Theme.Dark}>
          <EventCardStandard
            event={albumOfTheYear()}
            variant="trending"
            onPress={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(
        screen.getByTestId(`predict-next-event-kalshi-${EVENT_ID}`),
      ).toHaveStyle({
        backgroundColor: darkTheme.colors.background.elevated1,
        borderColor: darkTheme.colors.border.muted,
      });
    });
  });

  describe('header', () => {
    it('shows the Category in caps', () => {
      renderCard();

      expect(
        screen.getByTestId(`predict-next-event-category-${EVENT_ID}`),
      ).toHaveTextContent('CULTURE');
    });

    it('draws the dashed divider below the header', () => {
      renderCard();

      expect(
        screen.getByTestId(`predict-next-event-header-${EVENT_ID}-divider`),
      ).toHaveStyle({ borderStyle: 'dashed' });
    });

    it('falls back to the title in caps without a Category', () => {
      renderCard({ event: albumOfTheYear({ category: undefined }) });

      expect(
        screen.getByTestId(`predict-next-event-category-${EVENT_ID}`),
      ).toHaveTextContent('ALBUM OF THE YEAR');
    });

    it('shows a LIVE marker in the success color while the Event is live', () => {
      mockIsEventLive.mockReturnValue(true);

      renderCard();

      expect(screen.getByTestId(liveTestId)).toHaveTextContent('LIVE');
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

    it('has no LIVE marker for a non-game Event, which is never live yet', () => {
      renderCard();

      expect(mockIsEventLive).toHaveBeenCalledWith(albumOfTheYear());
      expect(screen.queryByTestId(liveTestId)).not.toBeOnTheScreen();
      expect(screen.queryByText('LIVE')).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(`predict-next-event-header-${EVENT_ID}-divider`),
      ).toBeOnTheScreen();
    });

    it.each([undefined, 'default'] as const)(
      'has no LIVE marker or header with the %s variant',
      (variant) => {
        mockIsEventLive.mockReturnValue(true);

        renderCard({ variant });

        expect(screen.queryByTestId(liveTestId)).not.toBeOnTheScreen();
        expect(screen.queryByText('LIVE')).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(`predict-next-event-header-${EVENT_ID}`),
        ).not.toBeOnTheScreen();
      },
    );
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

    it('names each row by its yes Outcome in BodySm, then a placeholder rank and its percentage price', () => {
      renderCard();

      const first = within(screen.getByTestId(rowTestId(SWIFT)));
      expect(first.getByText('Taylor Swift')).toHaveStyle({
        fontSize: 14,
        lineHeight: 22,
      });
      expect(first.getByText('Leads')).toHaveStyle({
        fontSize: 12,
        lineHeight: 20,
      });
      expect(first.getByText('34%')).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Album of the Year, Taylor Swift 34%'),
      ).toBeOnTheScreen();

      const second = within(screen.getByTestId(rowTestId(EILISH)));
      expect(second.getByText('Billie Eilish')).toBeOnTheScreen();
      expect(second.getByText('Second')).toBeOnTheScreen();
      expect(second.getByText('22%')).toBeOnTheScreen();

      expect(
        screen.queryByText('Will Taylor Swift win Album of the Year?'),
      ).not.toBeOnTheScreen();
    });

    it('shows a dash and price unavailable label when Ask Price is missing', () => {
      const album = albumOfTheYear();
      const [swift, ...others] = album.markets;

      renderCard({
        event: {
          ...album,
          markets: [
            {
              ...swift,
              outcomes: [
                { ...swift.outcomes[0], askPrice: undefined },
                swift.outcomes[1],
              ],
            },
            ...others,
          ],
        },
      });

      expect(screen.getByTestId(priceTestId(SWIFT))).toHaveTextContent('—');
      expect(
        screen.getByLabelText(
          'Album of the Year, Taylor Swift price unavailable',
        ),
      ).toBeOnTheScreen();
    });

    it('labels rows by position, not by price', () => {
      const album = albumOfTheYear();
      const [swift, eilish, carpenter] = album.markets;

      renderCard({ event: { ...album, markets: [carpenter, eilish, swift] } });

      expect(
        within(screen.getByTestId(rowTestId(CARPENTER))).getByText('Leads'),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByTestId(rowTestId(EILISH))).getByText('Second'),
      ).toBeOnTheScreen();
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
      const album = albumOfTheYear();
      const [swift, ...others] = album.markets;
      const [, no] = swift.outcomes;

      renderCard({
        event: {
          ...album,
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
      const album = albumOfTheYear();

      renderCard({ event: album, onOrder });
      fireEvent.press(screen.getByTestId(priceTestId(EILISH)));

      expect(onOrder).toHaveBeenCalledTimes(1);
      expect(onOrder).toHaveBeenCalledWith(
        album,
        album.markets[1],
        album.markets[1].outcomes[0],
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
      const album = albumOfTheYear();
      const [swift, ...others] = album.markets;

      renderCard({
        event: {
          ...album,
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
