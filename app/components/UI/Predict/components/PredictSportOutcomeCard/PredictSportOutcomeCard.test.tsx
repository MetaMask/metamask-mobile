import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictSportOutcomeCard, {
  type PredictSportOutcomeButton,
} from './PredictSportOutcomeCard';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import { PREDICT_SPORT_OUTCOME_CARD_TEST_IDS } from './PredictSportOutcomeCard.testIds';

const createButtons = (
  overrides: Partial<PredictSportOutcomeButton>[] = [],
): PredictSportOutcomeButton[] => {
  const defaults: PredictSportOutcomeButton[] = [
    {
      label: 'SEA',
      price: 70,
      onPress: jest.fn(),
      variant: 'yes',
      teamColor: TEST_HEX_COLORS.TEAM_SEA,
    },
    {
      label: 'DEN',
      price: 30,
      onPress: jest.fn(),
      variant: 'no',
      teamColor: TEST_HEX_COLORS.TEAM_DEN,
    },
  ];

  return defaults.map((btn, i) => ({ ...btn, ...overrides[i] }));
};

const createDefaultProps = (overrides = {}) => ({
  title: 'Moneyline',
  subtitle: '$845.21k Vol',
  buttons: createButtons(),
  ...overrides,
});

describe('PredictSportOutcomeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title and subtitle', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(
        screen.getByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE),
      ).toHaveTextContent('Moneyline');
      expect(
        screen.getByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.SUBTITLE),
      ).toHaveTextContent('$845.21k Vol');
    });

    it('renders without subtitle when not provided', () => {
      const props = createDefaultProps({ subtitle: undefined });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(
        screen.getByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.SUBTITLE),
      ).not.toBeOnTheScreen();
    });

    it('renders two buttons with inline layout', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(screen.getByText('SEA · 70¢')).toBeOnTheScreen();
      expect(screen.getByText('DEN · 30¢')).toBeOnTheScreen();
    });

    it('renders three buttons for draw-capable markets', () => {
      const buttons: PredictSportOutcomeButton[] = [
        {
          label: 'LIV',
          price: 45,
          onPress: jest.fn(),
          variant: 'yes',
          teamColor: TEST_HEX_COLORS.PURE_RED,
        },
        {
          label: 'Draw',
          price: 25,
          onPress: jest.fn(),
          variant: 'draw',
        },
        {
          label: 'ARS',
          price: 30,
          onPress: jest.fn(),
          variant: 'no',
          teamColor: TEST_HEX_COLORS.PURE_BLUE,
        },
      ];
      const props = createDefaultProps({ buttons });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(screen.getByText('LIV · 45¢')).toBeOnTheScreen();
      expect(screen.getByText('DRAW · 25¢')).toBeOnTheScreen();
      expect(screen.getByText('ARS · 30¢')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      const props = createDefaultProps({ testID: 'custom-card' });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(screen.getByTestId('custom-card')).toBeOnTheScreen();
    });

    it('assigns indexed testIDs to each button', () => {
      const props = createDefaultProps();

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-0`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-1`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('press handling', () => {
    it('calls button onPress when pressed', () => {
      const buttons = createButtons();
      const props = createDefaultProps({ buttons });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);
      fireEvent.press(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-0`,
        ),
      );

      expect(buttons[0].onPress).toHaveBeenCalledTimes(1);
      expect(buttons[1].onPress).not.toHaveBeenCalled();
    });

    it('calls second button onPress when pressed', () => {
      const buttons = createButtons();
      const props = createDefaultProps({ buttons });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);
      fireEvent.press(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-1`,
        ),
      );

      expect(buttons[1].onPress).toHaveBeenCalledTimes(1);
      expect(buttons[0].onPress).not.toHaveBeenCalled();
    });

    it('calls draw button onPress in three-way market', () => {
      const drawOnPress = jest.fn();
      const buttons: PredictSportOutcomeButton[] = [
        { label: 'Home', price: 40, onPress: jest.fn(), variant: 'yes' },
        { label: 'Draw', price: 30, onPress: drawOnPress, variant: 'draw' },
        { label: 'Away', price: 30, onPress: jest.fn(), variant: 'no' },
      ];
      const props = createDefaultProps({ buttons });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);
      fireEvent.press(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-1`,
        ),
      );

      expect(drawOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call handlers when disabled', () => {
      const buttons = createButtons();
      const props = createDefaultProps({ buttons, disabled: true });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);
      fireEvent.press(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-0`,
        ),
      );
      fireEvent.press(
        screen.getByTestId(
          `${PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.CONTAINER}-button-1`,
        ),
      );

      expect(buttons[0].onPress).not.toHaveBeenCalled();
      expect(buttons[1].onPress).not.toHaveBeenCalled();
    });
  });

  describe('market type variants', () => {
    it('renders BTTS card with neutral Yes/No buttons', () => {
      const buttons: PredictSportOutcomeButton[] = [
        { label: 'Yes', price: 55, onPress: jest.fn(), variant: 'yes' },
        { label: 'No', price: 45, onPress: jest.fn(), variant: 'no' },
      ];
      const props = createDefaultProps({
        title: 'Both Teams to Score',
        subtitle: '$120.5k Vol',
        buttons,
      });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(
        screen.getByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE),
      ).toHaveTextContent('Both Teams to Score');
      expect(screen.getByText('YES · 55¢')).toBeOnTheScreen();
      expect(screen.getByText('NO · 45¢')).toBeOnTheScreen();
    });

    it('renders player prop card with Over/Under buttons', () => {
      const buttons: PredictSportOutcomeButton[] = [
        { label: 'Over', price: 48, onPress: jest.fn(), variant: 'yes' },
        { label: 'Under', price: 52, onPress: jest.fn(), variant: 'no' },
      ];
      const props = createDefaultProps({
        title: 'LeBron James',
        subtitle: '$50.3k Vol',
        buttons,
      });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(
        screen.getByTestId(PREDICT_SPORT_OUTCOME_CARD_TEST_IDS.TITLE),
      ).toHaveTextContent('LeBron James');
      expect(screen.getByText('OVER · 48¢')).toBeOnTheScreen();
      expect(screen.getByText('UNDER · 52¢')).toBeOnTheScreen();
    });

    it('renders halftime result with three-way neutral buttons', () => {
      const buttons: PredictSportOutcomeButton[] = [
        { label: 'Home', price: 40, onPress: jest.fn(), variant: 'yes' },
        { label: 'Draw', price: 35, onPress: jest.fn(), variant: 'draw' },
        { label: 'Away', price: 25, onPress: jest.fn(), variant: 'no' },
      ];
      const props = createDefaultProps({
        title: 'Halftime Result',
        subtitle: '$30k Vol',
        buttons,
      });

      renderWithProvider(<PredictSportOutcomeCard {...props} />);

      expect(screen.getByText('HOME · 40¢')).toBeOnTheScreen();
      expect(screen.getByText('DRAW · 35¢')).toBeOnTheScreen();
      expect(screen.getByText('AWAY · 25¢')).toBeOnTheScreen();
    });
  });
});
