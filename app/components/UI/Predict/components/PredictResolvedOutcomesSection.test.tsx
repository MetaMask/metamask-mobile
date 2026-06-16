import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { PredictOutcome } from '../types';
import { formatVolume } from '../utils/format';
import PredictResolvedOutcomesSection from './PredictResolvedOutcomesSection';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.resolved_outcomes': 'Resolved outcomes',
      'predict.volume_abbreviated': 'Vol.',
      'predict.outcome_draw': 'Draw',
    };

    return translations[key] ?? key;
  },
}));

jest.mock('../utils/format');

const createMockOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome => ({
  id: 'resolved-outcome-1',
  providerId: 'test-provider',
  marketId: 'test-market',
  title: 'Resolved outcome',
  description: 'Resolved outcome description',
  image: 'https://example.com/image.png',
  status: 'closed',
  tokens: [
    {
      id: 'token-yes',
      title: 'Yes',
      price: 1,
    },
    {
      id: 'token-no',
      title: 'No',
      price: 0,
    },
  ],
  volume: 1000000,
  groupItemTitle: 'Resolved outcome',
  ...overrides,
});

describe('PredictResolvedOutcomesSection', () => {
  const mockFormatVolume = formatVolume as jest.MockedFunction<
    typeof formatVolume
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatVolume.mockReturnValue('1.0M');
  });

  it('returns null when there are no closed outcomes', () => {
    const { toJSON } = render(
      <PredictResolvedOutcomesSection
        closedOutcomes={[]}
        isExpanded={false}
        onToggle={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders a collapsed header with the resolved outcome count', () => {
    const closedOutcomes = [
      createMockOutcome({ id: 'resolved-1', groupItemTitle: 'June 9' }),
      createMockOutcome({ id: 'resolved-2', groupItemTitle: 'June 10' }),
    ];

    const { getByText, queryByText } = render(
      <PredictResolvedOutcomesSection
        closedOutcomes={closedOutcomes}
        isExpanded={false}
        onToggle={jest.fn()}
      />,
    );

    expect(getByText('Resolved outcomes')).toBeOnTheScreen();
    expect(getByText('2')).toBeOnTheScreen();
    expect(queryByText('June 9')).toBeNull();
    expect(queryByText('June 10')).toBeNull();
  });

  it('calls onToggle when the collapsible header is pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <PredictResolvedOutcomesSection
        closedOutcomes={[createMockOutcome()]}
        isExpanded={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(getByText('Resolved outcomes'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders resolved outcomes when expanded', () => {
    const closedOutcomes = [
      createMockOutcome({ id: 'resolved-1', groupItemTitle: 'June 9' }),
      createMockOutcome({
        id: 'resolved-2',
        groupItemTitle: 'June 10',
        tokens: [
          { id: 'token-yes-2', title: 'Yes', price: 0 },
          { id: 'token-no-2', title: 'No', price: 1 },
        ],
      }),
    ];

    const { getByText } = render(
      <PredictResolvedOutcomesSection
        closedOutcomes={closedOutcomes}
        isExpanded
        onToggle={jest.fn()}
      />,
    );

    expect(getByText('June 9')).toBeOnTheScreen();
    expect(getByText('June 10')).toBeOnTheScreen();
    expect(getByText('Yes')).toBeOnTheScreen();
    expect(getByText('No')).toBeOnTheScreen();
  });
});
