import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictGame,
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
        logoFacing: 'right',
        primaryColor: `#${'97233F'}` as PredictHexColor,
      },
      homeTeam: {
        name: 'Carolina Panthers',
        abbreviation: 'CAR',
        logoFacing: 'right',
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

// The logo and fallback are decorative and hidden from assistive technology.
const HIDDEN = { includeHiddenElements: true };
const MIRRORED = { transform: [{ scaleX: -1 }] };

const getGame = (event: PredictEvent): PredictGame => {
  if (!event.sports?.game) {
    throw new Error('Game fixture missing');
  }
  return event.sports.game;
};

/** An Event whose Teams both have logos, optionally listed home first. */
const createLogoEvent = (
  teamOrder?: PredictGame['teamOrder'],
): PredictEvent => {
  const event = createEvent();
  const game = getGame(event);
  game.teamOrder = teamOrder;
  game.homeTeam.logoUrl = 'https://example.com/car.png' as PredictHttpsUrl;
  return event;
};

/** The Game Selections of the elements matching `prefix`, in render order. */
const renderedSelections = (
  prefix: string,
  container: Pick<typeof screen, 'getAllByTestId'> = screen,
) =>
  container
    .getAllByTestId(new RegExp(`^${prefix}-(away|home)$`), HIDDEN)
    .map((match) =>
      String(match.props.testID).endsWith('-home') ? 'home' : 'away',
    );

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

    renderCard(event, { onOrder: jest.fn() });

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
    if (event.sports?.game) {
      event.sports.game.homeTeam.logoUrl =
        'https://example.com/car.png' as PredictHttpsUrl;
    }

    renderCard(event, { variant: 'featured' });

    expect(screen.getByText(event.title)).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-away', {
        includeHiddenElements: true,
      }),
    ).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-home', {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(screen.getByText('Arizona Cardinals')).toHaveStyle({ width: 80 });
    expect(
      screen.getByTestId('predict-next-game-matchup-game-event'),
    ).toHaveStyle({ height: 96, paddingBottom: 16 });
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

  it('lists the away Team first when the Game sends no Team order', () => {
    const event = createLogoEvent();

    renderCard(event, { variant: 'featured', onOrder: jest.fn() });

    const matchup = screen.getByTestId('predict-next-game-matchup-game-event');
    expect(
      renderedSelections('predict-next-game-logo-game-event', within(matchup)),
    ).toEqual(['away', 'home']);
    expect(
      within(matchup)
        .getAllByText(/^\d+$/)
        .map((score) => score.props.children),
    ).toEqual(['17', '21']);
    expect(renderedSelections('predict-next-game-bar-game-event')).toEqual([
      'away',
      'home',
    ]);
    expect(renderedSelections('predict-next-game-quote-game-event')).toEqual([
      'away',
      'home',
    ]);
  });

  it('lists the home Team first in the compact rows and actions of a home_first Game', () => {
    const event = createLogoEvent('home_first');

    renderCard(event, { onOrder: jest.fn() });

    expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
      'home',
      'away',
    ]);
    expect(renderedSelections('predict-next-game-quote-game-event')).toEqual([
      'home',
      'away',
    ]);
  });

  it('lists the home Team first in the featured matchup, bar and actions of a home_first Game', () => {
    const event = createLogoEvent('home_first');

    renderCard(event, { variant: 'featured', onOrder: jest.fn() });

    const matchup = screen.getByTestId('predict-next-game-matchup-game-event');
    expect(
      renderedSelections('predict-next-game-logo-game-event', within(matchup)),
    ).toEqual(['home', 'away']);
    expect(
      within(matchup)
        .getAllByText(/^\d+$/)
        .map((score) => score.props.children),
    ).toEqual(['21', '17']);
    expect(renderedSelections('predict-next-game-bar-game-event')).toEqual([
      'home',
      'away',
    ]);
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-home'),
    ).toHaveStyle({ width: '53%' });
    expect(renderedSelections('predict-next-game-quote-game-event')).toEqual([
      'home',
      'away',
    ]);
  });

  it('mirrors a left-facing logo in the left slot of a home_first Game', () => {
    const event = createLogoEvent('home_first');
    const game = getGame(event);
    game.homeTeam.logoFacing = 'left';
    game.awayTeam.logoFacing = 'left';

    renderCard(event, { variant: 'featured' });

    // Both face left: the left-slot (home) logo points away from the centre.
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-home', HIDDEN),
    ).toHaveStyle(MIRRORED);
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-away', HIDDEN),
    ).not.toHaveStyle(MIRRORED);
  });

  it('never mirrors a featured logo without a facing', () => {
    const event = createLogoEvent();
    const game = getGame(event);
    game.homeTeam.logoFacing = undefined;
    game.awayTeam.logoFacing = undefined;

    renderCard(event, { variant: 'featured' });

    expect(
      screen.getByTestId('predict-next-game-logo-game-event-away', HIDDEN),
    ).not.toHaveStyle(MIRRORED);
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-home', HIDDEN),
    ).not.toHaveStyle(MIRRORED);
  });

  it('never mirrors compact row logos', () => {
    renderCard(createLogoEvent());

    expect(
      screen.getByTestId('predict-next-game-logo-game-event-away', HIDDEN),
    ).not.toHaveStyle(MIRRORED);
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-home', HIDDEN),
    ).not.toHaveStyle(MIRRORED);
  });

  it('shows an unmirrored abbreviation when a mirrored featured logo fails to load', () => {
    renderCard(createLogoEvent(), { variant: 'featured' });

    fireEvent(
      screen.getByTestId('predict-next-game-logo-game-event-home', HIDDEN),
      'error',
    );

    const fallback = screen.getByTestId(
      'predict-next-game-logo-fallback-game-event-home',
      HIDDEN,
    );
    expect(fallback).toHaveTextContent('CAR');
    expect(fallback).not.toHaveStyle(MIRRORED);
    expect(
      screen.queryByTestId('predict-next-game-logo-game-event-home', HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('splits the featured scheduled date and time', () => {
    const event = createEvent();
    if (!event.sports?.game) {
      throw new Error('Game fixture missing');
    }
    event.sports.game.status = 'scheduled';

    renderCard(event, { variant: 'featured' });

    expect(screen.getByText('Thursday, September 10')).toBeOnTheScreen();
    expect(screen.getByText(/^8:20\s*PM$/)).toBeOnTheScreen();
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

    renderCard(event, { variant: 'featured', onOrder: jest.fn() });

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

  it('shows quotes as prices, not buttons, without an order handler', () => {
    renderCard(createEvent());

    const quote = screen.getByTestId('predict-next-game-quote-game-event-away');
    expect(quote).toHaveTextContent('ARI · 47¢');
    expect(screen.queryByRole('button', { name: /buy/ })).not.toBeOnTheScreen();
  });

  it('fills an active quote with the Team color when the price color falls back', () => {
    const event = createEvent();
    // Pale enough that its price color falls back to the theme's success color.
    getGame(event).homeTeam.primaryColor = `#${'FFF7CC'}` as PredictHexColor;

    renderCard(event, { onOrder: jest.fn() });

    expect(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    ).toHaveStyle({ backgroundColor: `#${'FFF7CC'}` });
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

  it('disables a Team action without an Ask Price and counts its Market as more', () => {
    const event = createEvent({
      markets: [
        createMarket('away', 'away', null),
        createMarket('home', 'home', '0.53'),
      ],
    });
    const onOrder = jest.fn();

    renderCard(event, { onOrder });

    const awayAction = screen.getByTestId(
      'predict-next-game-quote-game-event-away',
    );
    expect(awayAction).toHaveTextContent('ARI');
    expect(awayAction).not.toHaveTextContent('¢');
    expect(awayAction).toBeDisabled();
    fireEvent.press(awayAction);
    expect(onOrder).not.toHaveBeenCalled();
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
