import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
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
import { fullGameMoneylineMetadata } from '../../contracts/v1/fixtures/fullGameMoneyline';
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
  ...fullGameMoneylineMetadata(),
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
    .getAllByTestId(new RegExp(`^${prefix}-(away|draw|home)$`), HIDDEN)
    .map((match) => {
      const testID = String(match.props.testID);
      if (testID.endsWith('-home')) {
        return 'home';
      }
      if (testID.endsWith('-draw')) {
        return 'draw';
      }
      return 'away';
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

  describe.each(['compact', 'featured'] as const)('%s variant', (variant) => {
    const variantProps =
      variant === 'compact' ? {} : { variant: 'featured' as const };
    const expectedLabelFontSize = variant === 'featured' ? 14 : 16;
    const expectedLabelLineHeight = variant === 'featured' ? 22 : 24;

    it('uses the elevated1 container, 20pt radius, muted border, and 16pt padding with no dividers', () => {
      renderCard(createEvent(), variantProps);

      const card = screen.getByTestId('predict-next-event-kalshi-game-event');
      expect(card).toHaveStyle({
        backgroundColor: lightTheme.colors.background.elevated1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: lightTheme.colors.border.muted,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
      });
      expect(
        screen.queryByTestId('predict-next-game-header-game-event-divider'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-event-more-game-event'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-game-event-competition'),
      ).not.toBeOnTheScreen();
    });

    it('uses dark theme elevated1 surface in dark mode', () => {
      render(
        <ThemeProvider theme={Theme.Dark}>
          <EventCardGame
            event={createEvent()}
            onPress={jest.fn()}
            {...variantProps}
          />
        </ThemeProvider>,
      );

      expect(
        screen.getByTestId('predict-next-event-kalshi-game-event'),
      ).toHaveStyle({
        backgroundColor: darkTheme.colors.background.elevated1,
        borderColor: darkTheme.colors.border.muted,
      });
    });

    it('renders the 2-line header with live dot, period/clock in error color, competition, and no LIVE text', () => {
      renderCard(createEvent(), { ...variantProps, onOrder: jest.fn() });

      const title = screen.getByTestId(
        'predict-next-game-header-game-event-title',
      );
      expect(title).toHaveTextContent('Cardinals vs Panthers');
      expect(title).toHaveProp('numberOfLines', 1);
      expect(title).toHaveStyle({
        fontSize: 14,
        lineHeight: 22,
        color: lightTheme.colors.text.default,
      });

      expect(
        screen.getByTestId('predict-next-game-live-dot-game-event'),
      ).toHaveStyle({
        width: 12,
        height: 12,
        borderRadius: 9999,
        backgroundColor: lightTheme.colors.error.default,
      });
      expect(screen.getByText('Q4 12:22')).toHaveStyle({
        color: lightTheme.colors.error.default,
        fontSize: 12,
        lineHeight: 20,
      });
      expect(screen.getByText(' • NFL')).toHaveStyle({
        color: lightTheme.colors.text.alternative,
        fontSize: 12,
        lineHeight: 20,
      });
      expect(
        screen.queryByText(strings('predict.game_status.live')),
      ).not.toBeOnTheScreen();
    });

    it('renders competition without a leading bullet when a live game has no period or clock', () => {
      const event = createEvent();
      const game = getGame(event);
      game.period = undefined;
      game.clock = undefined;

      renderCard(event, variantProps);

      expect(
        screen.getByTestId('predict-next-game-live-dot-game-event'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-status-game-event'),
      ).toHaveTextContent('NFL');
      expect(screen.queryByText(/•/)).not.toBeOnTheScreen();
    });

    it('renders scheduled date and competition without a live dot or scores', () => {
      jest.useFakeTimers({ now: new Date('2026-09-08T16:00:00Z') });
      const event = createEvent();
      getGame(event).status = 'scheduled';

      renderCard(event, { ...variantProps, onOrder: jest.fn() });
      jest.useRealTimers();

      expect(
        screen.queryByTestId('predict-next-game-live-dot-game-event'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-status-game-event'),
      ).toHaveTextContent(/^Thu · 8:20\sPM • NFL$/);
      expect(
        screen.queryByTestId('predict-next-game-score-game-event-away'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-score-game-event-home'),
      ).not.toBeOnTheScreen();
    });

    it('renders Final with competition and scores for completed games without a stale clock', () => {
      const event = createEvent();
      getGame(event).status = 'completed';

      renderCard(event, { ...variantProps, onOrder: jest.fn() });

      expect(
        screen.queryByTestId('predict-next-game-live-dot-game-event'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-status-game-event'),
      ).toHaveTextContent('Final • NFL');
      expect(screen.queryByText('Q4 12:22')).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-score-game-event-away'),
      ).toHaveTextContent('17');
      expect(
        screen.getByTestId('predict-next-game-score-game-event-home'),
      ).toHaveTextContent('21');
    });

    it.each([
      ['delayed', 'Delayed • NFL'],
      ['suspended', 'Suspended • NFL'],
      ['postponed', 'Postponed • NFL'],
      ['canceled', 'Canceled • NFL'],
    ] as const)(
      'renders %s status cleanly without stale clock or scores',
      (status, expected) => {
        const event = createEvent();
        getGame(event).status = status;

        renderCard(event, variantProps);

        expect(
          screen.queryByTestId('predict-next-game-live-dot-game-event'),
        ).not.toBeOnTheScreen();
        expect(
          screen.getByTestId('predict-next-game-status-game-event'),
        ).toHaveTextContent(expected);
        expect(screen.queryByText('Q4 12:22')).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId('predict-next-game-score-game-event-away'),
        ).not.toBeOnTheScreen();
      },
    );

    it('renders stacked outcome rows with 28x28 unmirrored logos, ABBR ShortName labels, green probability bars, scores, and 64x40 percentage pills', () => {
      const event = createLogoEvent();
      const game = getGame(event);
      game.awayTeam.logoFacing = 'left';
      game.homeTeam.logoFacing = 'left';

      renderCard(event, { ...variantProps, onOrder: jest.fn() });

      expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
        'away',
        'home',
      ]);

      const awayLogo = screen.getByTestId(
        'predict-next-game-logo-game-event-away',
        HIDDEN,
      );
      const homeLogo = screen.getByTestId(
        'predict-next-game-logo-game-event-home',
        HIDDEN,
      );
      expect(awayLogo).toHaveStyle({ width: 28, height: 28 });
      expect(homeLogo).toHaveStyle({ width: 28, height: 28 });
      expect(awayLogo).not.toHaveStyle(MIRRORED);
      expect(homeLogo).not.toHaveStyle(MIRRORED);

      const awayLabel = screen.getByTestId(
        'predict-next-game-team-label-game-event-away',
      );
      const homeLabel = screen.getByTestId(
        'predict-next-game-team-label-game-event-home',
      );
      expect(awayLabel).toHaveTextContent('ARI Cardinals');
      expect(homeLabel).toHaveTextContent('CAR Panthers');
      expect(awayLabel).toHaveStyle({
        fontSize: expectedLabelFontSize,
        lineHeight: expectedLabelLineHeight,
        color: lightTheme.colors.text.default,
      });

      expect(
        screen.getByTestId('predict-next-game-bar-game-event-away'),
      ).toHaveStyle({
        width: '47%',
        height: 2,
        borderRadius: 1,
        backgroundColor: lightTheme.colors.success.default,
      });
      expect(
        screen.getByTestId('predict-next-game-bar-game-event-home'),
      ).toHaveStyle({
        width: '53%',
        height: 2,
        borderRadius: 1,
        backgroundColor: lightTheme.colors.success.default,
      });

      const awayScore = screen.getByTestId(
        'predict-next-game-score-game-event-away',
      );
      expect(awayScore).toHaveTextContent('17');
      expect(awayScore).toHaveStyle({
        fontSize: 16,
        lineHeight: 24,
        color: lightTheme.colors.text.default,
      });

      const awayPill = screen.getByTestId(
        'predict-next-game-quote-game-event-away',
      );
      expect(awayPill).toHaveTextContent('47%');
      expect(awayPill).toHaveStyle({
        minWidth: 64,
        height: 40,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: lightTheme.colors.success.muted,
        backgroundColor: 'transparent',
      });
      expect(within(awayPill).getByText('47%')).toHaveStyle({
        color: lightTheme.colors.success.default,
        fontSize: 16,
        lineHeight: 24,
      });
      expect(
        screen.getByRole('button', { name: 'Arizona Cardinals, 47%, buy' }),
      ).toBeOnTheScreen();
    });

    it('renders a Draw row between away and home for a 3-way game market without a logo', () => {
      const event = createEvent({
        markets: [
          createMarket('away-market', 'away', '0.45'),
          createMarket('draw-market', 'draw', '0.25'),
          createMarket('home-market', 'home', '0.30'),
        ],
      });

      renderCard(event, { ...variantProps, onOrder: jest.fn() });

      expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
        'away',
        'draw',
        'home',
      ]);
      expect(
        screen.getByTestId('predict-next-game-team-label-game-event-draw'),
      ).toHaveTextContent('Draw');
      expect(
        screen.queryByTestId('predict-next-game-logo-game-event-draw', HIDDEN),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-score-game-event-draw', HIDDEN),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-next-game-bar-game-event-draw'),
      ).toHaveStyle({ width: '25%' });
      expect(
        screen.getByTestId('predict-next-game-quote-game-event-draw'),
      ).toHaveTextContent('25%');
    });

    it('lists the home Team first for a home_first Game, keeping draw in the middle', () => {
      const event = createLogoEvent('home_first');
      event.markets = [
        createMarket('away-market', 'away', '0.45'),
        createMarket('draw-market', 'draw', '0.25'),
        createMarket('home-market', 'home', '0.30'),
      ];

      renderCard(event, { ...variantProps, onOrder: jest.fn() });

      expect(renderedSelections('predict-next-game-team-game-event')).toEqual([
        'home',
        'draw',
        'away',
      ]);
    });

    it('renders lowercase $X vol. in the footer and omits comment count', () => {
      renderCard(createEvent(), variantProps);

      const volume = screen.getByTestId('predict-next-event-volume-game-event');
      expect(volume).toHaveTextContent('$125k vol.');
      expect(volume).toHaveStyle({
        fontSize: 12,
        lineHeight: 20,
        color: lightTheme.colors.text.alternative,
      });
    });

    it('omits the footer when volume is absent', () => {
      renderCard(createEvent({ volume: undefined }), variantProps);

      expect(
        screen.queryByTestId('predict-next-game-game-event-footer'),
      ).not.toBeOnTheScreen();
    });

    it('shows a disabled "-" pill with price unavailable label when askPrice is missing', () => {
      const event = createEvent({
        markets: [
          createMarket('away', 'away', null),
          createMarket('home', 'home', '0.53'),
        ],
      });
      const onOrder = jest.fn();
      const onPress = jest.fn();

      renderCard(event, { ...variantProps, onOrder, onPress });

      const awayPill = screen.getByTestId(
        'predict-next-game-quote-game-event-away',
      );
      expect(awayPill).toHaveTextContent(/^-$/);
      expect(awayPill).toBeDisabled();
      expect(
        screen.getByLabelText('Arizona Cardinals, price unavailable'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-next-game-bar-game-event-away'),
      ).not.toBeOnTheScreen();

      fireEvent.press(awayPill);
      expect(onOrder).not.toHaveBeenCalled();
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows non-interactive percentage pills without an order handler or on inactive markets', () => {
      const event = createEvent({
        markets: [
          createMarket('away', 'away', '0.47', 'inactive'),
          createMarket('home', 'home', '0.53'),
        ],
      });
      const onOrder = jest.fn();

      renderCard(event, { ...variantProps, onOrder });

      const awayPill = screen.getByTestId(
        'predict-next-game-quote-game-event-away',
      );
      expect(awayPill).toHaveTextContent('47%');
      expect(screen.getByLabelText('Arizona Cardinals, 47%')).toBeOnTheScreen();
      fireEvent.press(awayPill);
      expect(onOrder).not.toHaveBeenCalled();
    });

    it('opens the Event screen from header, team row, and footer without ordering, and opens Order Flow from a pill', () => {
      const event = createEvent();
      const onPress = jest.fn();
      const onOrder = jest.fn();

      renderCard(event, { ...variantProps, onPress, onOrder });

      fireEvent.press(
        screen.getByTestId('predict-next-event-content-kalshi-game-event'),
      );
      fireEvent.press(
        screen.getByTestId('predict-next-game-team-content-game-event-away'),
      );
      fireEvent.press(
        screen.getByTestId('predict-next-game-game-event-footer'),
      );
      expect(onPress).toHaveBeenCalledTimes(3);
      expect(onOrder).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByTestId('predict-next-game-quote-game-event-home'),
      );
      expect(onOrder).toHaveBeenCalledTimes(1);
      expect(onOrder).toHaveBeenCalledWith(
        event,
        event.markets[1],
        event.markets[1].outcomes[0],
      );
      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  it('uses the three-character display abbreviation for missing Team media', () => {
    const event = createEvent();
    getGame(event).homeTeam.abbreviation = undefined;
    getGame(event).homeTeam.logoUrl = undefined;

    renderCard(event);

    expect(
      screen.getByTestId(
        'predict-next-game-logo-fallback-game-event-home',
        HIDDEN,
      ),
    ).toHaveTextContent('CAR');
    expect(
      screen.getByTestId('predict-next-game-team-label-game-event-home'),
    ).toHaveTextContent('CAR Panthers');
  });

  it('defaults to the compact variant with 16/24 outcome labels', () => {
    renderCard(createEvent());

    expect(
      screen.getByTestId('predict-next-game-team-label-game-event-away'),
    ).toHaveStyle({ fontSize: 16, lineHeight: 24 });
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

    it('gives each Team abbreviation the Team name as its accessibility label', () => {
      renderCard(createSmallEvent(), { variant: 'small' });

      expect(
        screen.getByTestId('predict-next-game-team-label-game-event-away'),
      ).toHaveProp('accessibilityLabel', 'Arizona Cardinals');
      expect(
        screen.getByTestId('predict-next-game-team-label-game-event-home'),
      ).toHaveProp('accessibilityLabel', 'Carolina Panthers');
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
