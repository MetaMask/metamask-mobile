import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
} from '../../types';
import type { GameSelectionQuote } from '../game';
import { MarketFooterCard } from './MarketFooterCard';
import { MarketFooterCardTestIds } from './MarketFooterCard.testIds';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const createOutcome = (
  id: string,
  side: PredictOutcome['side'],
  askPrice?: string,
  label = id,
): PredictOutcome => ({
  id: id as PredictEntityId,
  side,
  label,
  askPrice: askPrice as PredictDecimal | undefined,
});

const createMarket = (
  id: string,
  yes: PredictOutcome,
  no: PredictOutcome,
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  outcomes: [yes, no],
});

const createQuote = (
  market: PredictMarket,
  outcome: PredictOutcome,
): GameSelectionQuote => ({ market, outcome });

const createGame = (overrides: Partial<PredictGame> = {}): PredictGame => ({
  status: 'in_progress',
  awayTeam: { name: 'Arizona Cardinals', abbreviation: 'ARI' },
  homeTeam: { name: 'Carolina Panthers', abbreviation: 'CAR' },
  observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
  ...overrides,
});

const awayYes = createOutcome('away-yes', 'yes', '0.47', 'Buffalo');
const homeYes = createOutcome('home-yes', 'yes', '0.53', 'Pittsburgh');
const awayMarket = createMarket(
  'away-market',
  awayYes,
  createOutcome('away-no', 'no'),
);
const homeMarket = createMarket(
  'home-market',
  homeYes,
  createOutcome('home-no', 'no'),
);

const renderFooter = (
  overrides: Partial<React.ComponentProps<typeof MarketFooterCard>> = {},
) => {
  const onSelectMarket = overrides.onSelectMarket ?? jest.fn();
  return {
    onSelectMarket,
    ...render(
      <MarketFooterCard
        game={createGame()}
        awayQuote={createQuote(awayMarket, awayYes)}
        homeQuote={createQuote(homeMarket, homeYes)}
        onSelectMarket={onSelectMarket}
        {...overrides}
      />,
    ),
  };
};

describe('MarketFooterCard', () => {
  it('renders Team abbreviations and Ask Prices from the Game snapshot', () => {
    renderFooter();

    expect(screen.getByText('ARI · 47¢')).toBeOnTheScreen();
    expect(screen.getByText('CAR · 53¢')).toBeOnTheScreen();
    expect(screen.queryByText('Buffalo')).not.toBeOnTheScreen();
    expect(screen.queryByText('Pittsburgh')).not.toBeOnTheScreen();
  });

  it('falls back to the first three letters of the Team name', () => {
    renderFooter({
      game: createGame({
        awayTeam: { name: 'Buffalo Bills' },
        homeTeam: { name: 'Pittsburgh Steelers' },
      }),
    });

    expect(screen.getByText('BUF · 47¢')).toBeOnTheScreen();
    expect(screen.getByText('PIT · 53¢')).toBeOnTheScreen();
  });

  it('omits a missing Ask Price without inventing zero', () => {
    const noPriceYes = createOutcome('away-yes', 'yes', undefined, 'Buffalo');
    const noPriceMarket = createMarket(
      'away-market',
      noPriceYes,
      createOutcome('away-no', 'no'),
    );

    renderFooter({
      awayQuote: createQuote(noPriceMarket, noPriceYes),
    });

    expect(screen.getByText('ARI')).toBeOnTheScreen();
    expect(screen.queryByText(/0¢/)).not.toBeOnTheScreen();
  });

  it('renders a Draw control from product copy', () => {
    const drawYes = createOutcome('draw-yes', 'yes', '0.10', 'Tie');
    const drawMarket = createMarket(
      'draw-market',
      drawYes,
      createOutcome('draw-no', 'no'),
    );

    renderFooter({
      drawQuote: createQuote(drawMarket, drawYes),
    });

    expect(screen.getByText('Draw · 10¢')).toBeOnTheScreen();
    expect(screen.queryByText('Tie')).not.toBeOnTheScreen();
  });

  it('uses Team colors for the filled controls', () => {
    renderFooter({
      game: createGame({
        awayTeam: {
          name: 'Arizona Cardinals',
          abbreviation: 'ARI',
          primaryColor: `#${'97233F'}`,
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          primaryColor: `#${'0085CA'}`,
        },
      }),
    });

    expect(
      screen.getByTestId(MarketFooterCardTestIds.button('away')),
    ).toHaveStyle({
      backgroundColor: `#${'97233F'}`,
    });
    expect(
      screen.getByTestId(MarketFooterCardTestIds.button('home')),
    ).toHaveStyle({
      backgroundColor: `#${'0085CA'}`,
    });
    expect(screen.getByText('ARI · 47¢')).toHaveStyle({
      color: lightTheme.colors.overlay.inverse,
    });
  });

  it('emits the Market id when a Team control is pressed', () => {
    const { onSelectMarket } = renderFooter({
      selectedMarketId: homeMarket.id,
    });

    fireEvent.press(screen.getByTestId(MarketFooterCardTestIds.button('away')));

    expect(onSelectMarket).toHaveBeenCalledWith(awayMarket.id);
    expect(onSelectMarket).toHaveBeenCalledTimes(1);
  });

  it('marks the selected Market control without disabling it', () => {
    renderFooter({ selectedMarketId: awayMarket.id });

    expect(
      screen.getByTestId(MarketFooterCardTestIds.button('away')).props
        .accessibilityState,
    ).toEqual({ selected: true, disabled: false });
    expect(
      screen.getByTestId(MarketFooterCardTestIds.button('home')).props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: false });
  });
});
