import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictOutcomeGroupChips from './PredictOutcomeGroupChips';
import {
  PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS,
  getOutcomeGroupChipTestId,
} from './PredictOutcomeGroupChips.testIds';
import type { PredictOutcomeGroup } from '../../types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const labels: Record<string, string> = {
      'predict.outcome_groups.game_lines': 'Game Lines',
      'predict.outcome_groups.assists': 'Assists',
      'predict.outcome_groups.points': 'Points',
      'predict.outcome_groups.rebounds': 'Rebounds',
      'predict.outcome_groups.goals': 'Goals',
    };
    return labels[key] ?? key;
  }),
}));

const createMockGroups = (
  keys: string[] = ['game_lines', 'assists', 'points'],
): PredictOutcomeGroup[] => keys.map((key) => ({ key, outcomes: [] }));

describe('PredictOutcomeGroupChips', () => {
  const mockOnGroupSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when groups is empty', () => {
      const { toJSON } = render(
        <PredictOutcomeGroupChips
          groups={[]}
          selectedGroupKey=""
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders a chip for each group', () => {
      const groups = createMockGroups();

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(
        getByTestId(getOutcomeGroupChipTestId('game_lines')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getOutcomeGroupChipTestId('assists')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getOutcomeGroupChipTestId('points')),
      ).toBeOnTheScreen();
    });

    it('renders the container with default testID', () => {
      const groups = createMockGroups(['game_lines']);

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(
        getByTestId(PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the container with custom testID', () => {
      const groups = createMockGroups(['game_lines']);

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
          testID="custom-test-id"
        />,
      );

      expect(getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });

  describe('labels', () => {
    it('renders i18n labels for known group keys', () => {
      const groups = createMockGroups(['game_lines', 'assists']);

      const { getByText } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(getByText('Game Lines')).toBeOnTheScreen();
      expect(getByText('Assists')).toBeOnTheScreen();
    });

    it('falls back to title-cased key for unknown group keys', () => {
      const groups = createMockGroups(['unknown_market_type']);

      const { getByText } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="unknown_market_type"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(getByText('Unknown Market Type')).toBeOnTheScreen();
    });
  });

  describe('selection', () => {
    it('marks the selected chip with accessibilityState selected', () => {
      const groups = createMockGroups();

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="assists"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      const selectedChip = getByTestId(getOutcomeGroupChipTestId('assists'));
      const unselectedChip = getByTestId(
        getOutcomeGroupChipTestId('game_lines'),
      );

      expect(selectedChip.props.accessibilityState).toEqual({ selected: true });
      expect(unselectedChip.props.accessibilityState).toEqual({
        selected: false,
      });
    });

    it('calls onGroupSelect with the group key when a chip is pressed', () => {
      const groups = createMockGroups();

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      fireEvent.press(getByTestId(getOutcomeGroupChipTestId('points')));

      expect(mockOnGroupSelect).toHaveBeenCalledTimes(1);
      expect(mockOnGroupSelect).toHaveBeenCalledWith('points');
    });

    it('calls onGroupSelect when pressing the already selected chip', () => {
      const groups = createMockGroups();

      const { getByTestId } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      fireEvent.press(getByTestId(getOutcomeGroupChipTestId('game_lines')));

      expect(mockOnGroupSelect).toHaveBeenCalledWith('game_lines');
    });
  });

  describe('single group', () => {
    it('renders a single chip when only one group exists', () => {
      const groups = createMockGroups(['game_lines']);

      const { getByTestId, getByText } = render(
        <PredictOutcomeGroupChips
          groups={groups}
          selectedGroupKey="game_lines"
          onGroupSelect={mockOnGroupSelect}
        />,
      );

      expect(
        getByTestId(getOutcomeGroupChipTestId('game_lines')),
      ).toBeOnTheScreen();
      expect(getByText('Game Lines')).toBeOnTheScreen();
    });
  });
});
