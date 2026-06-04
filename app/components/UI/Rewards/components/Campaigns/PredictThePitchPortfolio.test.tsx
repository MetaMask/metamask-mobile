import React from 'react';
import { render } from '@testing-library/react-native';
import PredictThePitchPortfolio, {
  PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS,
} from './PredictThePitchPortfolio';
import type { PredictThePitchPositionsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('../../utils/formatUtils', () => ({
  formatPercentChange: (value: number) =>
    `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`,
  formatUsd: (value: number) => `$${value.toFixed(2)}`,
}));

const TEST_IDS = PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS;

const positions: PredictThePitchPositionsDto = {
  computedAt: '2025-01-01T00:00:00.000Z',
  positions: [
    {
      conditionId: 'condition-1',
      conditionName: 'Match winner',
      conditionSlug: 'match-winner',
      eventId: 'market-1',
      eventSlug: 'event-a',
      iconUrl: null,
      capitalDeployed: 12,
      pnl: 3,
      roi: 0.25,
    },
    {
      conditionId: 'condition-2',
      conditionName: 'Total goals',
      conditionSlug: 'total-goals',
      eventId: 'market-2',
      eventSlug: 'event-b',
      iconUrl: null,
      capitalDeployed: 20,
      pnl: -2,
      roi: -0.1,
    },
  ],
};

describe('PredictThePitchPortfolio', () => {
  it('renders position rows and formatted values', () => {
    const { getByText, getByTestId } = render(
      <PredictThePitchPortfolio
        positions={positions}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByText('Match winner')).toBeDefined();
    expect(getByText('event-a')).toBeDefined();
    expect(getByText('$12.00')).toBeDefined();
    expect(getByText('+25.00%')).toBeDefined();
  });

  it('limits rows when maxEntries is provided', () => {
    const { getByText, queryByText } = render(
      <PredictThePitchPortfolio
        positions={positions}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
        maxEntries={1}
      />,
    );

    expect(getByText('Match winner')).toBeDefined();
    expect(queryByText('Total goals')).toBeNull();
  });

  it('shows empty and error states', () => {
    const { getByTestId, rerender } = render(
      <PredictThePitchPortfolio
        positions={{ positions: [], computedAt: null }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByTestId(TEST_IDS.EMPTY)).toBeDefined();

    rerender(
      <PredictThePitchPortfolio
        positions={null}
        isLoading={false}
        hasError
        refetch={jest.fn()}
      />,
    );
    expect(getByTestId(TEST_IDS.ERROR)).toBeDefined();
  });
});
