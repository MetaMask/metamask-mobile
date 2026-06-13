import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { PredictOutcome } from '../../../types';
import PredictResolvedOutcomesToggle from './PredictResolvedOutcomesToggle';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.resolved_outcomes': 'Resolved Outcomes',
      'predict.volume_abbreviated': 'Vol.',
      'predict.outcome_draw': 'Draw',
    };

    return translations[key] ?? key;
  },
}));

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    marketId: 'market-1',
    providerId: 'polymarket',
    title: 'Outcome',
    groupItemTitle: 'Team A Wins',
    status: 'closed',
    volume: 1000,
    tokens: [
      { id: 'yes-token', title: 'Yes', price: 1 },
      { id: 'no-token', title: 'No', price: 0 },
    ],
    ...overrides,
  }) as PredictOutcome;

describe('PredictResolvedOutcomesToggle', () => {
  it('renders the resolved outcomes label and count', () => {
    const { getByText, queryByText } = render(
      <PredictResolvedOutcomesToggle
        closedOutcomes={[
          createOutcome({ id: 'outcome-1' }),
          createOutcome({ id: 'outcome-2' }),
        ]}
        isExpanded={false}
        onToggle={jest.fn()}
      />,
    );

    expect(getByText('Resolved Outcomes')).toBeOnTheScreen();
    expect(getByText('2')).toBeOnTheScreen();
    expect(queryByText('Team A Wins')).toBeNull();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <PredictResolvedOutcomesToggle
        closedOutcomes={[createOutcome()]}
        isExpanded={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(getByText('Resolved Outcomes'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders resolved outcome rows when expanded', () => {
    const { getByText } = render(
      <PredictResolvedOutcomesToggle
        closedOutcomes={[createOutcome()]}
        isExpanded
        onToggle={jest.fn()}
      />,
    );

    expect(getByText('Team A Wins')).toBeOnTheScreen();
    expect(getByText('Yes')).toBeOnTheScreen();
  });
});
