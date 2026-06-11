import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { TEST_HEX_COLORS } from '../../../testUtils/mockColors';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../types';
import type { MoneylineTeamTokens } from '../hooks/useGameLiveMarkets';
import PredictQuickBetBar from './PredictQuickBetBar';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const game: PredictMarketGame = {
  id: 'game-1',
  startTime: '2026-06-10T00:00:00Z',
  status: 'ongoing',
  league: 'nba',
  elapsed: '8:00',
  period: 'Q4',
  score: { away: 105, home: 105, raw: '105-105' },
  homeTeam: {
    id: 'team-nyk',
    name: 'New York Knicks',
    logo: '',
    abbreviation: 'NYK',
    color: TEST_HEX_COLORS.TEAM_GSW,
  },
  awayTeam: {
    id: 'team-sas',
    name: 'San Antonio Spurs',
    logo: '',
    abbreviation: 'SAS',
    color: TEST_HEX_COLORS.PURE_BLACK,
  },
};

const awayToken: PredictOutcomeToken = {
  id: 'token-sas',
  title: 'Spurs',
  price: 0.54,
};
const homeToken: PredictOutcomeToken = {
  id: 'token-nyk',
  title: 'Knicks',
  price: 0.46,
};
const outcome = {
  id: 'outcome-moneyline',
  tokens: [awayToken, homeToken],
} as unknown as PredictOutcome;

const moneyline: MoneylineTeamTokens = { outcome, homeToken, awayToken };

const initialState = {
  engine: { backgroundState },
};

const renderBar = (onBetPress = jest.fn()) => ({
  onBetPress,
  ...renderWithProvider(
    <PredictQuickBetBar
      game={game}
      moneyline={moneyline}
      awayPct={54}
      homePct={46}
      onBetPress={onBetPress}
    />,
    { state: initialState },
  ),
});

describe('PredictQuickBetBar', () => {
  it('renders both team abbreviations with live percentages', () => {
    const { getByText } = renderBar();

    expect(getByText('SAS 54%')).toBeOnTheScreen();
    expect(getByText('NYK 46%')).toBeOnTheScreen();
  });

  it('invokes onBetPress with the away outcome token when the away side is tapped', () => {
    const { getByTestId, onBetPress } = renderBar();

    fireEvent.press(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_AWAY));

    expect(onBetPress).toHaveBeenCalledWith(outcome, awayToken);
  });

  it('invokes onBetPress with the home outcome token when the home side is tapped', () => {
    const { getByTestId, onBetPress } = renderBar();

    fireEvent.press(getByTestId(PREDICT_GAME_LIVE_TEST_IDS.QUICK_BET_HOME));

    expect(onBetPress).toHaveBeenCalledWith(outcome, homeToken);
  });
});
