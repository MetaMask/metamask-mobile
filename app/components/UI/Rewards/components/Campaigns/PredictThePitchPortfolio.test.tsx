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

jest.mock('../../../Predict/hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({
    navigateToMarketDetails: jest.fn(),
    navigateToBuyPreview: jest.fn(),
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'predict.position_info' && vars) {
      return `${vars.initialValue} on ${vars.outcome} to win ${vars.shares}`;
    }
    if (key === 'predict.market_details.amount_on_outcome' && vars) {
      return `${vars.amount} on ${vars.outcome}`;
    }
    if (
      key === 'rewards.predict_the_pitch_campaign.position_sold_at' &&
      vars?.time
    ) {
      return `Sold ${vars.time}`;
    }
    if (key === 'predict.market_details.won') {
      return 'Won';
    }
    if (key === 'predict.market_details.lost') {
      return 'Lost';
    }
    if (key === 'predict.market_details.ended') {
      return 'Ended';
    }
    return key;
  }),
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

const TEST_IDS = PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS;

const positions: PredictThePitchPositionsDto = {
  computedAt: '2025-01-01T00:00:00.000Z',
  openPositions: [
    {
      outcomeAssetId: 'token-1',
      outcomeAsset: 'Yes',
      conditionId: 'condition-1',
      conditionName: 'Match winner',
      conditionSlug: 'match-winner',
      eventId: 'market-1',
      eventSlug: 'event-a',
      iconUrl: null,
      capitalDeployed: 12,
      pnl: 3,
      roi: 0.25,
      status: 'open',
      fillShares: 10,
      fillSharesBought: 10,
      fillSharesSold: 0,
      fillPrice: 0.5,
      fillDate: '2025-01-01T00:00:00.000Z',
    },
    {
      outcomeAssetId: 'token-2',
      outcomeAsset: 'No',
      conditionId: 'condition-2',
      conditionName: 'Total goals',
      conditionSlug: 'total-goals',
      eventId: 'market-2',
      eventSlug: 'event-b',
      iconUrl: null,
      capitalDeployed: 20,
      pnl: -2,
      roi: -0.1,
      status: 'open',
      fillShares: 8,
      fillSharesBought: 8,
      fillSharesSold: 0,
      fillPrice: 0.4,
      fillDate: '2025-01-02T00:00:00.000Z',
    },
  ],
  resolvedPositions: [],
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
    expect(getByText('$12 on Yes to win $10')).toBeDefined();
    expect(getByText('$15')).toBeDefined();
    expect(getByText('25%')).toBeDefined();
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
        positions={{
          openPositions: [],
          resolvedPositions: [],
          computedAt: null,
        }}
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

  it('renders sold positions with realized PnL instead of settlement Won/Lost copy', () => {
    const { getByText, queryByText } = render(
      <PredictThePitchPortfolio
        positions={{
          computedAt: '2025-01-01T00:00:00.000Z',
          openPositions: [],
          resolvedPositions: [
            {
              outcomeAssetId: 'token-sold',
              outcomeAsset: 'Yes',
              conditionId: 'condition-sold',
              conditionName: 'Early exit market',
              conditionSlug: null,
              eventId: null,
              eventSlug: null,
              iconUrl: null,
              capitalDeployed: 10,
              pnl: 2,
              roi: 0.2,
              status: 'sold',
              fillShares: 0,
              fillSharesBought: 10,
              fillSharesSold: 10,
              fillPrice: 1,
              fillDate: '2025-01-01T00:00:00.000Z',
            },
          ],
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByText('Early exit market')).toBeDefined();
    expect(getByText('$12')).toBeDefined();
    expect(getByText('20%')).toBeDefined();
    expect(queryByText(/^Won /)).toBeNull();
  });

  it('renders resolved positions with settlement Won/Lost copy', () => {
    const { getByText } = render(
      <PredictThePitchPortfolio
        positions={{
          computedAt: '2025-01-01T00:00:00.000Z',
          openPositions: [],
          resolvedPositions: [
            {
              outcomeAssetId: 'token-resolved',
              outcomeAsset: 'Brazil',
              conditionId: 'condition-resolved',
              conditionName: 'Brazil to win',
              conditionSlug: null,
              eventId: null,
              eventSlug: null,
              iconUrl: null,
              capitalDeployed: 10,
              pnl: 5,
              roi: 0.5,
              status: 'resolved',
              fillShares: 0,
              fillSharesBought: 10,
              fillSharesSold: 0,
              fillPrice: 1,
              fillDate: '2025-01-01T00:00:00.000Z',
            },
          ],
        }}
        isLoading={false}
        hasError={false}
        refetch={jest.fn()}
      />,
    );

    expect(getByText('Won $15')).toBeDefined();
  });
});
