import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { PREDICT_SPORT_OUTCOME_CARD_TEST_IDS } from '../PredictSportOutcomeCard/PredictSportOutcomeCard.testIds';
import { OutcomesContent } from './PredictGameOutcomeCards';

const createToken = (
  id: string,
  title: string,
  price: number,
): PredictOutcomeToken => ({
  id,
  title,
  shortTitle: title,
  price,
});

const createTeamTotalOutcome = (
  team: string,
  line: number,
  volume: number,
): PredictOutcome => ({
  id: `${team.toLowerCase()}-${line}`,
  providerId: 'polymarket',
  marketId: `${team.toLowerCase()}-totals`,
  title: `${team} O/U ${line}`,
  description: `${team} total points`,
  image: '',
  status: 'open',
  active: true,
  acceptingOrders: true,
  tokens: [
    createToken(`${team}-${line}-over`, `O ${line}`, 0.55),
    createToken(`${team}-${line}-under`, `U ${line}`, 0.45),
  ],
  volume,
  liquidity: 100,
  groupItemTitle: `${team} O/U ${line}`,
  sportsMarketType: 'team_totals',
  line,
});

const createSharedTeamTotalsGroup = (): {
  group: PredictOutcomeGroup;
  patriots21: PredictOutcome;
} => {
  const patriots24 = createTeamTotalOutcome('Patriots', 24.5, 100);
  const patriots21 = createTeamTotalOutcome('Patriots', 21.5, 90);
  const broncos18 = createTeamTotalOutcome('Broncos', 18.5, 80);
  const broncos20 = createTeamTotalOutcome('Broncos', 20.5, 70);

  return {
    group: {
      key: 'team_totals',
      outcomes: [],
      subgroups: [
        {
          key: 'team_totals-0',
          title: 'Patriots Totals',
          outcomes: [patriots24, patriots21],
        },
        {
          key: 'team_totals-1',
          title: 'Broncos Totals',
          outcomes: [broncos18, broncos20],
        },
      ],
    },
    patriots21,
  };
};

describe('PredictGameOutcomeCards', () => {
  it('renders independent line cards for shared NFL team totals', () => {
    const { group } = createSharedTeamTotalsGroup();
    const onBuyPress = jest.fn();

    renderWithProvider(
      <OutcomesContent group={group} onBuyPress={onBuyPress} />,
    );

    const patriotsCard = screen.getByTestId('team_totals-team_totals-0-0');
    const broncosCard = screen.getByTestId('team_totals-team_totals-1-1');
    expect(
      within(patriotsCard).getByTestId(
        PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE,
      ),
    ).toHaveTextContent('Patriots Totals');
    expect(
      within(broncosCard).getByTestId(
        PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE,
      ),
    ).toHaveTextContent('Broncos Totals');
    expect(
      screen.getAllByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.LINE_SELECTOR),
    ).toHaveLength(2);
  });

  it('selects a team total line before buying', () => {
    const { group, patriots21 } = createSharedTeamTotalsGroup();
    const onBuyPress = jest.fn();

    renderWithProvider(
      <OutcomesContent group={group} onBuyPress={onBuyPress} />,
    );

    const patriotsCard = screen.getByTestId('team_totals-team_totals-0-0');

    fireEvent.press(
      within(patriotsCard).getByTestId(
        `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.LINE_SELECTOR}-line-1-21.5`,
      ),
    );
    fireEvent.press(
      within(patriotsCard).getByTestId(`${patriotsCard.props.testID}-button-0`),
    );

    expect(onBuyPress).toHaveBeenLastCalledWith(
      patriots21,
      patriots21.tokens[0],
    );
  });
});
