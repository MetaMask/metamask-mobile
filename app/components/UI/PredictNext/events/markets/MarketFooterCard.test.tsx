import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictGame,
  PredictHexColor,
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
  const onOrder = overrides.onOrder ?? jest.fn();
  return {
    onOrder,
    ...render(
      <MarketFooterCard
        game={createGame()}
        awayQuote={createQuote(awayMarket, awayYes)}
        homeQuote={createQuote(homeMarket, homeYes)}
        onOrder={onOrder}
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
          primaryColor: `#${'97233F'}` as PredictHexColor,
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          primaryColor: `#${'0085CA'}` as PredictHexColor,
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

  it('starts the Order flow for the Yes Outcome when a Team control is pressed', () => {
    const { onOrder } = renderFooter();

    fireEvent.press(screen.getByTestId(MarketFooterCardTestIds.button('away')));

    expect(onOrder).toHaveBeenCalledWith(createQuote(awayMarket, awayYes));
    expect(onOrder).toHaveBeenCalledTimes(1);
  });

  it('displays and trades the Yes Outcome even when the tagged Outcome is No', () => {
    // The quote's Outcome carries the Game Selection tag (chart association)
    // and may be the No side; the Team control still trades the Yes side.
    const taggedNo = createOutcome('away-no', 'no', undefined, 'Away loses');
    const yes = createOutcome('away-yes', 'yes', '0.47', 'Buffalo');
    const { onOrder } = renderFooter({
      awayQuote: createQuote(
        createMarket('away-market', yes, taggedNo),
        taggedNo,
      ),
    });

    expect(screen.getByText('ARI · 47¢')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(MarketFooterCardTestIds.button('away')));
    expect(onOrder).toHaveBeenCalledWith({
      market: expect.objectContaining({ id: 'away-market' }),
      outcome: yes,
    });
  });

  it('fails closed when the winner Market has no Yes Outcome', () => {
    // A Team control trades the Yes side of the winner Market; a Market
    // without a Yes Outcome offers no trade, matching findGameTradingQuote.
    const taggedNo = createOutcome('away-no', 'no', '0.47', 'Away loses');
    const noYesMarket: PredictMarket = {
      ...awayMarket,
      outcomes: [taggedNo, createOutcome('away-no-2', 'no')],
    };
    const { onOrder } = renderFooter({
      awayQuote: createQuote(noYesMarket, taggedNo),
    });

    expect(screen.getByText('ARI')).toBeOnTheScreen();
    expect(screen.queryByText('ARI · 47¢')).not.toBeOnTheScreen();
    const button = screen.getByTestId(MarketFooterCardTestIds.button('away'));
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onOrder).not.toHaveBeenCalled();
  });

  it('disables a Team control whose Market is not active', () => {
    const { onOrder } = renderFooter({
      awayQuote: createQuote({ ...awayMarket, status: 'inactive' }, awayYes),
    });

    const button = screen.getByTestId(MarketFooterCardTestIds.button('away'));
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onOrder).not.toHaveBeenCalled();
  });

  it('disables a Team control without an Ask Price', () => {
    const noPriceYes = createOutcome('away-yes', 'yes', undefined, 'Buffalo');
    const { onOrder } = renderFooter({
      awayQuote: createQuote(
        createMarket('away-market', noPriceYes, createOutcome('away-no', 'no')),
        noPriceYes,
      ),
    });

    const button = screen.getByTestId(MarketFooterCardTestIds.button('away'));
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onOrder).not.toHaveBeenCalled();
  });
});
