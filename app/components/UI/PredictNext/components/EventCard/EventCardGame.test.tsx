import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictHexColor,
  PredictHttpsUrl,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { EventCardGame } from './EventCardGame';

const createOutcome = (
  id: string,
  gameSelection: 'home' | 'away' | 'draw',
  askPrice?: string,
): PredictOutcome => ({
  id: id as PredictEntityId,
  side: 'yes',
  label: id,
  askPrice: askPrice as PredictDecimal | undefined,
  gameSelection,
});

const createMarket = (
  id: string,
  selection: 'home' | 'away' | 'draw',
  askPrice: string | null = '0.53',
  status: PredictMarket['status'] = 'active',
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status,
  outcomes: [
    createOutcome(`${id}-yes`, selection, askPrice ?? undefined),
    {
      id: `${id}-no` as PredictEntityId,
      side: 'no',
      label: 'No',
    },
  ],
});

const createEvent = (overrides: Partial<PredictEvent> = {}): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  volume: '125000',
  sports: {
    sport: {
      id: 'american-football' as PredictEntityId,
      label: 'American football',
    },
    competition: { id: 'nfl' as PredictEntityId, label: 'NFL' },
    game: {
      status: 'in_progress',
      awayTeam: {
        name: 'Arizona Cardinals',
        abbreviation: 'ARI',
        logoUrl: 'https://example.com/ari.png' as PredictHttpsUrl,
        primaryColor: `#${'97233F'}` as PredictHexColor,
      },
      homeTeam: {
        name: 'Carolina Panthers',
        abbreviation: 'CAR',
        primaryColor: `#${'0085CA'}` as PredictHexColor,
      },
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '12:22',
      observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
    },
  },
  markets: [
    createMarket('away-market', 'away', '0.47'),
    createMarket('home-market', 'home', '0.53'),
    createMarket('draw-market', 'draw', '0'),
    createMarket('prop-market', 'draw', undefined),
  ],
  ...overrides,
});

const renderCard = (
  event = createEvent(),
  props: Partial<React.ComponentProps<typeof EventCardGame>> = {},
) => render(<EventCardGame event={event} onPress={jest.fn()} {...props} />);

describe('EventCardGame', () => {
  const originalLocale = I18n.locale;

  beforeAll(() => {
    I18n.locale = 'en-US';
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('defaults to the compact live layout', () => {
    const event = createEvent();

    renderCard(event);

    expect(
      screen.getByText(strings('predict.game_status.live')),
    ).toBeOnTheScreen();
    expect(screen.getByText('Q4 · 12:22')).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-team-game-event-away'),
    ).toHaveTextContent('Arizona Cardinals17');
    expect(screen.getByText('Carolina Panthers')).toBeOnTheScreen();
    expect(screen.getByText('21')).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    ).toHaveTextContent('ARI · 47¢');
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    ).toHaveStyle({ width: '100%' });
    expect(
      screen.getByTestId('predict-next-game-game-event-competition'),
    ).toHaveTextContent('NFL');
    expect(
      screen.getByTestId('predict-next-event-more-game-event'),
    ).toHaveTextContent('+2 more');
    expect(screen.queryByText(event.title)).not.toBeOnTheScreen();
  });

  it('renders the featured matchup layout', () => {
    const event = createEvent();

    renderCard(event, { variant: 'featured' });

    expect(screen.getByText(event.title)).toBeOnTheScreen();
    expect(screen.getByText('Arizona Cardinals')).toHaveStyle({ width: 80 });
    expect(
      screen.getByTestId('predict-next-game-matchup-game-event'),
    ).toHaveStyle({ height: 80, paddingBottom: 16 });
    expect(
      screen.getByTestId('predict-next-game-bar-game-event'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-away'),
    ).toHaveStyle({ width: '47%' });
    expect(
      screen.queryByTestId('predict-next-game-event-footer'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('2.13x')).not.toBeOnTheScreen();
  });

  it('splits the featured scheduled date and time', () => {
    const event = createEvent();
    if (!event.sports?.game) {
      throw new Error('Game fixture missing');
    }
    event.sports.game.status = 'scheduled';

    renderCard(event, { variant: 'featured' });

    expect(screen.getByText('Thursday, September 10')).toBeOnTheScreen();
    expect(screen.getByText('8:20 PM')).toBeOnTheScreen();
  });

  it('omits the featured bar when both Ask Prices are zero', () => {
    const event = createEvent({
      markets: [
        createMarket('away', 'away', '0'),
        createMarket('home', 'home', '0'),
      ],
    });

    renderCard(event, { variant: 'featured' });

    expect(
      screen.queryByTestId('predict-next-game-bar-game-event'),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['scheduled', 'SCHEDULED'],
    ['delayed', 'DELAYED · Q4 · 12:22'],
    ['suspended', 'SUSPENDED · Q4 · 12:22'],
    ['postponed', 'POSTPONED'],
    ['completed', 'FINAL'],
    ['canceled', 'CANCELED'],
  ] as const)('renders %s Game status', (status, expected) => {
    const event = createEvent({ startsAt: undefined });
    if (!event.sports?.game) {
      throw new Error('Game fixture missing');
    }
    event.sports.game.status = status;

    renderCard(event);

    const values = expected.split(' · ');

    expect(screen.getByText(values[0])).toBeOnTheScreen();
    if (values.length > 1) {
      expect(screen.getByText(values.slice(1).join(' · '))).toBeOnTheScreen();
    }
  });

  it('uses authoritative Game Selections and omits ambiguous Team quotes', () => {
    const event = createEvent({
      markets: [
        createMarket('away-one', 'away', '0.47'),
        createMarket('away-two', 'away', '0.48'),
        createMarket('home', 'home', '0.53'),
      ],
    });

    renderCard(event, { variant: 'featured' });

    expect(
      screen.queryByTestId('predict-next-game-quote-game-event-away'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-game-bar-game-event'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    ).toHaveStyle({ width: '100%' });
  });

  it('emits the Event, Market, and Outcome from an active quote', () => {
    const event = createEvent();
    const onOrder = jest.fn();
    renderCard(event, { onOrder });

    fireEvent.press(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    );

    expect(onOrder).toHaveBeenCalledWith(
      event,
      event.markets[0],
      event.markets[0].outcomes[0],
    );
  });

  it('shows a non-interactive Ask Price from an inactive Market', () => {
    const event = createEvent({
      markets: [
        createMarket('away', 'away', '0.47', 'inactive'),
        createMarket('home', 'home', '0.53'),
      ],
    });
    const onOrder = jest.fn();
    renderCard(event, { onOrder });

    fireEvent.press(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    );

    expect(onOrder).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    ).toHaveTextContent('ARI · 47¢');
  });

  it('uses the three-character display abbreviation for missing Team media', () => {
    const event = createEvent();
    if (!event.sports?.game) {
      throw new Error('Game fixture missing');
    }
    event.sports.game.homeTeam.abbreviation = undefined;
    event.sports.game.homeTeam.logoUrl = undefined;

    renderCard(event);

    expect(
      screen.getByTestId('predict-next-game-logo-fallback-game-event-home', {
        includeHiddenElements: true,
      }),
    ).toHaveTextContent('CAR');
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    ).toHaveTextContent('CAR · 53¢');
  });

  it('counts a linked Market without an Ask Price as more', () => {
    const event = createEvent({
      markets: [
        createMarket('away', 'away', null),
        createMarket('home', 'home', '0.53'),
      ],
    });

    renderCard(event);

    expect(
      screen.getByTestId('predict-next-event-more-game-event'),
    ).toHaveTextContent('+1 more');
  });

  it('keeps non-quote navigation independent from quote actions', () => {
    const event = createEvent();
    const onPress = jest.fn();
    const onOrder = jest.fn();
    renderCard(event, { onPress, onOrder });

    fireEvent.press(
      screen.getByTestId('predict-next-event-content-kalshi-game-event'),
    );
    fireEvent.press(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onOrder).toHaveBeenCalledTimes(1);
  });
});
