import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { brandColor, lightTheme } from '@metamask/design-tokens';
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
import { getContrastRatio } from '../game/useGameTeamColors';
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

    expect(
      within(
        screen.getByTestId('predict-next-game-header-game-event'),
      ).getByText(event.title),
    ).toBeOnTheScreen();
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
    expect(
      screen.getByTestId('predict-next-game-logo-game-event-away', HIDDEN),
    ).toHaveStyle({ width: 52, height: 48 });
    expect(
      screen.getByTestId('predict-next-game-team-label-game-event-away'),
    ).toHaveTextContent('ARI');
    expect(
      screen.getByTestId('predict-next-game-team-label-game-event-home'),
    ).toHaveTextContent('CAR');
    expect(
      within(
        screen.getByTestId('predict-next-game-matchup-game-event'),
      ).queryByText('Arizona Cardinals'),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('17')).toHaveStyle({ fontSize: 32 });
    expect(screen.getByTestId('predict-next-game-bar-game-event')).toHaveStyle({
      flexDirection: 'row',
      gap: 4,
    });
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-away'),
    ).toHaveStyle({ flex: 47, height: 4, borderRadius: 9999 });
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-home'),
    ).toHaveStyle({ flex: 53, height: 4, borderRadius: 9999 });
    expect(
      screen.queryByTestId('predict-next-game-event-footer'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('2.13x')).not.toBeOnTheScreen();
  });

  it('shows the featured header row with the Competition and a divider', () => {
    renderCard(createEvent(), { variant: 'featured' });

    const header = screen.getByTestId('predict-next-game-header-game-event');
    expect(within(header).getByText('Cardinals vs Panthers')).toHaveProp(
      'numberOfLines',
      1,
    );
    expect(
      screen.getByTestId('predict-next-game-header-game-event-competition'),
    ).toHaveTextContent('NFL');
    expect(
      screen.getByTestId('predict-next-game-header-game-event-divider'),
    ).toBeOnTheScreen();
  });

  it('omits the featured header Competition when the Event has none', () => {
    const event = createEvent();
    if (event.sports) {
      event.sports.competition = undefined;
    }

    renderCard(event, { variant: 'featured' });

    expect(
      within(
        screen.getByTestId('predict-next-game-header-game-event'),
      ).getByText(event.title),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-next-game-header-game-event-competition'),
    ).not.toBeOnTheScreen();
  });

  it('shows the featured live dot and label in the success color', () => {
    renderCard(createEvent(), { variant: 'featured' });

    expect(
      screen.getByTestId('predict-next-game-live-dot-game-event'),
    ).toHaveStyle({
      width: 8,
      height: 8,
      backgroundColor: lightTheme.colors.success.default,
    });
    expect(screen.getByText(strings('predict.game_status.live'))).toHaveStyle({
      color: lightTheme.colors.success.default,
    });
    expect(screen.getByText('Q4 · 12:22')).toBeOnTheScreen();
  });

  it('labels the featured quote pills with the Team abbreviation and price, and the accessibility label with the Team name', () => {
    const event = createEvent();
    const onOrder = jest.fn();

    renderCard(event, { variant: 'featured', onOrder });

    const away = screen.getByTestId('predict-next-game-quote-game-event-away');
    const home = screen.getByTestId('predict-next-game-quote-game-event-home');
    expect(away).toHaveTextContent(/^ARI\s*· 47¢$/);
    expect(home).toHaveTextContent(/^CAR\s*· 53¢$/);
    expect(
      screen.getByRole('button', {
        name: 'Arizona Cardinals, 47¢, buy',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Carolina Panthers, 53¢, buy',
      }),
    ).toBeOnTheScreen();
    expect(within(away).getByText('ARI')).toHaveProp('numberOfLines', 1);
    expect(within(away).getByText('· 47¢')).toBeOnTheScreen();
    expect(away).toHaveStyle({ height: 48, borderRadius: 9999 });
    expect(home).toHaveStyle({ height: 48, borderRadius: 9999 });
  });

  it('fills the first featured quote with the neutral primary color and the second with its Team color', () => {
    const event = createEvent();
    const homeColor = getGame(event).homeTeam.primaryColor;
    renderCard(event, { variant: 'featured', onOrder: jest.fn() });

    expect(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.icon.default });
    expect(
      screen.getByTestId('predict-next-game-quote-game-event-home'),
    ).toHaveStyle({ backgroundColor: homeColor });
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-away'),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.text.default });
    expect(
      screen.getByTestId('predict-next-game-bar-game-event-home'),
    ).toHaveStyle({ backgroundColor: homeColor });
  });

  it.each(['away', 'home'] as const)(
    'opens the order flow for the %s Team Outcome from a featured quote',
    (selection) => {
      const event = createEvent();
      const onOrder = jest.fn();
      const onPress = jest.fn();
      renderCard(event, { variant: 'featured', onOrder, onPress });

      fireEvent.press(
        screen.getByTestId(`predict-next-game-quote-game-event-${selection}`),
      );

      const market = event.markets[selection === 'away' ? 0 : 1];
      expect(onOrder).toHaveBeenCalledWith(event, market, market.outcomes[0]);
      expect(onPress).not.toHaveBeenCalled();
    },
  );

  it('shows a featured quote without a price as a disabled Team abbreviation pill', () => {
    const event = createEvent({
      markets: [
        createMarket('away', 'away', null),
        createMarket('home', 'home', '0.53'),
      ],
    });
    const onOrder = jest.fn();

    renderCard(event, { variant: 'featured', onOrder });

    const away = screen.getByTestId('predict-next-game-quote-game-event-away');
    expect(away).toHaveTextContent('ARI');
    expect(away).not.toHaveTextContent('Arizona Cardinals');
    expect(away).not.toHaveTextContent('¢');
    expect(
      screen.getByLabelText('Arizona Cardinals, price unavailable'),
    ).toBeOnTheScreen();
    expect(away).toBeDisabled();
    fireEvent.press(away);
    expect(onOrder).not.toHaveBeenCalled();
  });

  it('shows featured quotes as prices, not buttons, without an order handler', () => {
    renderCard(createEvent(), { variant: 'featured' });

    expect(
      screen.getByTestId('predict-next-game-quote-game-event-away'),
    ).toHaveTextContent(/^ARI\s*· 47¢$/);
    expect(screen.getByLabelText('Arizona Cardinals, 47¢')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /buy/ })).not.toBeOnTheScreen();
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
    ).toHaveStyle({ flex: 53 });
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

    const quote = screen.getByTestId('predict-next-game-quote-game-event-home');
    expect(quote).toHaveStyle({ backgroundColor: `#${'FFF7CC'}` });
    // White reads at about 1.08:1 on this fill, so the label is the dark ink.
    expect(within(quote).getByText(/·/)).toHaveStyle({
      color: brandColor.grey1000,
    });
  });

  it('keeps the white label on a dark Team fill', () => {
    const event = createEvent();
    getGame(event).homeTeam.primaryColor = `#${'0B2265'}` as PredictHexColor;

    renderCard(event, { onOrder: jest.fn() });

    const quote = screen.getByTestId('predict-next-game-quote-game-event-home');
    expect(quote).toHaveStyle({ backgroundColor: `#${'0B2265'}` });
    expect(within(quote).getByText(/·/)).toHaveStyle({
      color: lightTheme.colors.overlay.inverse,
    });
  });

  it('darkens a mid-tone Team fill that neither label color can sit on', () => {
    const event = createEvent();
    getGame(event).homeTeam.primaryColor = `#${'D2492A'}` as PredictHexColor;

    renderCard(event, { onOrder: jest.fn() });

    const quote = screen.getByTestId('predict-next-game-quote-game-event-home');
    const fill = StyleSheet.flatten(quote.props.style).backgroundColor;
    expect(fill).not.toBe(`#${'D2492A'}`);
    expect(
      getContrastRatio(lightTheme.colors.overlay.inverse, String(fill)),
    ).toBeGreaterThanOrEqual(4.5);
    expect(within(quote).getByText(/·/)).toHaveStyle({
      color: lightTheme.colors.overlay.inverse,
    });
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

  describe('small variant', () => {
    // 2026-09-11T00:20Z is Thursday 8:20 PM in the test time zone.
    const NOW = new Date('2026-09-08T16:00:00Z');

    const createSmallEvent = (overrides: Partial<PredictEvent> = {}) => {
      const event = createEvent(overrides);
      getGame(event).status = 'scheduled';
      return event;
    };

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows the Competition and start in the header, then a row per Team', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      expect(
        screen.getByTestId('predict-next-game-header-game-event-competition'),
      ).toHaveTextContent('NFL');
      expect(
        screen.getByTestId('predict-next-game-header-game-event-start'),
      ).toHaveTextContent(/^Thu · 8:20\sPM$/);
      expect(
        screen.getByTestId('predict-next-game-header-game-event-divider'),
      ).toBeOnTheScreen();
      expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
        'away',
        'home',
      ]);

      const away = within(
        screen.getByTestId('predict-next-game-team-game-event-away'),
      );
      expect(
        away.getByTestId('predict-next-game-logo-game-event-away', HIDDEN),
      ).toBeOnTheScreen();
      expect(
        away.getByTestId('predict-next-game-team-label-game-event-away'),
      ).toHaveTextContent('ARI');
      expect(
        away.getByTestId('predict-next-game-quote-game-event-away'),
      ).toHaveTextContent('47¢');

      const home = within(
        screen.getByTestId('predict-next-game-team-game-event-home'),
      );
      expect(
        home.getByTestId(
          'predict-next-game-logo-fallback-game-event-home',
          HIDDEN,
        ),
      ).toHaveTextContent('CAR');
      expect(
        home.getByTestId('predict-next-game-team-label-game-event-home'),
      ).toHaveTextContent('CAR');
      expect(
        home.getByTestId('predict-next-game-quote-game-event-home'),
      ).toHaveTextContent('53¢');
    });

    it('renders no bar, multiplier, score, footer or volume', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      expect(
        screen.queryByTestId('predict-next-game-bar-game-event'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-game-event-footer'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-status-game-event'),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(/x$/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Vol/)).not.toBeOnTheScreen();
    });

    it('is 190pt wide', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      expect(
        screen.getByTestId('predict-next-event-kalshi-game-event'),
      ).toHaveStyle({ width: 190 });
    });

    it('lays the Competition and start out on one line', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      const row = screen.getByTestId('predict-next-game-header-game-event-row');
      expect(row).toHaveStyle({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      });
      expect(
        within(row).getByTestId(
          'predict-next-game-header-game-event-competition',
        ),
      ).toHaveProp('numberOfLines', 1);
      expect(
        within(row).getByTestId('predict-next-game-header-game-event-start'),
      ).toHaveProp('numberOfLines', 1);
    });

    it.each([
      ['priced', [createMarket('away', 'away', '0.47')], jest.fn()],
      [
        'without an order handler',
        [createMarket('away', 'away', '0.47')],
        undefined,
      ],
      ['without an Ask Price', [createMarket('away', 'away', null)], jest.fn()],
    ])('sizes the price pill 54x32 when %s', (_, markets, onOrder) => {
      renderCard(
        createSmallEvent({
          markets: [...markets, createMarket('home', 'home')],
        }),
        { variant: 'small', onOrder },
      );

      expect(
        screen.getByTestId('predict-next-game-quote-game-event-away'),
      ).toHaveStyle({ width: 54, height: 32 });
    });

    it('keeps the layout and start time for a Game in progress', () => {
      const event = createSmallEvent();
      getGame(event).status = 'in_progress';

      renderCard(event, { variant: 'small' });

      expect(
        screen.getByTestId('predict-next-game-header-game-event-start'),
      ).toHaveTextContent(/^Thu · 8:20\sPM$/);
      expect(screen.queryByText('17')).not.toBeOnTheScreen();
      expect(screen.queryByText('21')).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-live-dot-game-event'),
      ).not.toBeOnTheScreen();
    });

    it('shows a short date for a Game more than a week out', () => {
      renderCard(
        createSmallEvent({
          startsAt: '2026-11-23T18:00:00Z' as PredictTimestamp,
        }),
        { variant: 'small' },
      );

      expect(
        screen.getByTestId('predict-next-game-header-game-event-start'),
      ).toHaveTextContent(/^Nov 23 · 1:00\sPM$/);
    });

    it('keeps the start on the right without a Competition', () => {
      const event = createSmallEvent();
      if (event.sports) {
        event.sports.competition = undefined;
      }

      renderCard(event, { variant: 'small' });

      expect(
        screen.queryByTestId('predict-next-game-header-game-event-competition'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-header-game-event-leading'),
      ).toHaveStyle({ flexGrow: 1 });
      expect(
        within(screen.getByTestId('predict-next-game-header-game-event-row'))
          .getAllByTestId(
            /^predict-next-game-header-game-event-(leading|start)$/,
          )
          .map((part) => String(part.props.testID).split('-').pop()),
      ).toEqual(['leading', 'start']);
      expect(
        screen.getByTestId('predict-next-game-header-game-event-start'),
      ).toHaveTextContent(/^Thu · 8:20\sPM$/);
    });

    it('omits the start without a start time', () => {
      renderCard(createSmallEvent({ startsAt: undefined }), {
        variant: 'small',
      });

      expect(
        screen.queryByTestId('predict-next-game-header-game-event-start'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-header-game-event-competition'),
      ).toHaveTextContent('NFL');
      expect(
        screen.getByTestId('predict-next-game-team-game-event-away'),
      ).toBeOnTheScreen();
    });

    it('lists the home Team first for a home_first Game', () => {
      renderCard(createLogoEvent('home_first'), { variant: 'small' });

      expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
        'home',
        'away',
      ]);
    });

    it('opens the order flow for the Team from a priced pill', () => {
      const event = createSmallEvent();
      const onPress = jest.fn();
      const onOrder = jest.fn();
      renderCard(event, { variant: 'small', onPress, onOrder });

      fireEvent.press(
        screen.getByRole('button', { name: 'Carolina Panthers, 53¢, buy' }),
      );

      expect(onOrder).toHaveBeenCalledWith(
        event,
        event.markets[1],
        event.markets[1].outcomes[0],
      );
      expect(onPress).not.toHaveBeenCalled();
    });

    it('opens the Event from the header and Team identities, not the pills', () => {
      const onPress = jest.fn();
      const onOrder = jest.fn();
      renderCard(createSmallEvent(), { variant: 'small', onPress, onOrder });

      fireEvent.press(
        screen.getByTestId('predict-next-event-content-kalshi-game-event'),
      );
      fireEvent.press(
        screen.getByTestId('predict-next-game-team-content-game-event-away'),
      );
      fireEvent.press(
        screen.getByTestId('predict-next-game-team-content-game-event-home'),
      );

      expect(onPress).toHaveBeenCalledTimes(3);
      expect(onOrder).not.toHaveBeenCalled();
    });

    it.each([
      [
        'without an Ask Price',
        [createMarket('away', 'away', null), createMarket('home', 'home')],
      ],
      ['without a Market', [createMarket('home', 'home')]],
    ])('shows "-" in a pill that does nothing %s', (_, markets) => {
      const onPress = jest.fn();
      const onOrder = jest.fn();
      renderCard(createSmallEvent({ markets }), {
        variant: 'small',
        onPress,
        onOrder,
      });

      const pill = screen.getByTestId(
        'predict-next-game-quote-game-event-away',
      );
      expect(pill).toHaveTextContent(/^-$/);
      expect(pill).toBeDisabled();
      expect(pill).toHaveProp(
        'accessibilityLabel',
        'Arizona Cardinals, price unavailable',
      );

      fireEvent.press(pill);

      expect(onOrder).not.toHaveBeenCalled();
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows the price, not a button, without an order handler', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      expect(
        screen.getByTestId('predict-next-game-quote-game-event-away'),
      ).toHaveTextContent('47¢');
      expect(
        screen.queryByRole('button', { name: /buy/ }),
      ).not.toBeOnTheScreen();
    });

    it('shows the price, not a button, from an inactive Market', () => {
      const onOrder = jest.fn();
      renderCard(
        createSmallEvent({
          markets: [
            createMarket('away', 'away', '0.47', 'inactive'),
            createMarket('home', 'home', '0.53'),
          ],
        }),
        { variant: 'small', onOrder },
      );

      const away = screen.getByTestId(
        'predict-next-game-quote-game-event-away',
      );
      expect(away).toHaveTextContent('47¢');
      expect(
        screen.queryByRole('button', { name: 'Arizona Cardinals, 47¢, buy' }),
      ).not.toBeOnTheScreen();
      fireEvent.press(away);

      expect(onOrder).not.toHaveBeenCalled();
    });
  });
});
