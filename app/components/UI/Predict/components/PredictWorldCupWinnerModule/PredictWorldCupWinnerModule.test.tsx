import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PredictWorldCupWinnerModule, {
  PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS,
} from './PredictWorldCupWinnerModule';
import type { PredictMarket, PredictOutcome } from '../../types';

const mockOpenBuySheet = jest.fn();
const mockExecuteGuardedAction = jest.fn((action: () => void) => action());

jest.mock('../../contexts', () => ({
  usePredictPreviewSheet: () => ({ openBuySheet: mockOpenBuySheet }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
  }),
}));

jest.mock('../../hooks/useResolvedPredictEntryPoint', () => ({
  useResolvedPredictEntryPoint: (ep: unknown) => ep ?? 'predict_feed',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    providerId: 'provider-1',
    marketId: 'market-1',
    title: 'Brazil Yes',
    description: '',
    image: 'https://example.com/brazil.png',
    status: 'open',
    tokens: [
      { id: 'token-yes', title: 'Yes', price: 0.18 },
      { id: 'token-no', title: 'No', price: 0.82 },
    ],
    volume: 1000,
    groupItemTitle: 'Brazil',
    ...overrides,
  }) as PredictOutcome;

const createMarket = (outcomes: PredictOutcome[]): PredictMarket =>
  ({
    id: 'market-1',
    title: 'World Cup Winner',
    outcomes,
    parentMarketId: null,
  }) as PredictMarket;

describe('PredictWorldCupWinnerModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the module container', () => {
    const market = createMarket([createOutcome()]);

    render(<PredictWorldCupWinnerModule market={market} />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders a tile for each outcome', () => {
    const outcomes = [
      createOutcome({ id: 'o-1', groupItemTitle: 'Brazil' }),
      createOutcome({ id: 'o-2', groupItemTitle: 'France' }),
      createOutcome({ id: 'o-3', groupItemTitle: 'England' }),
    ];
    const market = createMarket(outcomes);

    render(<PredictWorldCupWinnerModule market={market} />);

    outcomes.forEach((o) => {
      expect(
        screen.getByTestId(
          `${PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.TILE}-${o.id}`,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('calls openBuySheet with the outcome yes-token when a tile is pressed', () => {
    const outcome = createOutcome({ id: 'o-brazil' });
    const market = createMarket([outcome]);

    render(<PredictWorldCupWinnerModule market={market} />);

    fireEvent.press(
      screen.getByTestId(
        `${PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.TILE}-${outcome.id}`,
      ),
    );

    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        market,
        outcome,
        outcomeToken: outcome.tokens[0],
      }),
    );
  });

  it('renders the heading with the who_will_win string', () => {
    const market = createMarket([createOutcome()]);

    render(<PredictWorldCupWinnerModule market={market} />);

    expect(
      screen.getByTestId(PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.HEADING),
    ).toBeOnTheScreen();
  });
});
