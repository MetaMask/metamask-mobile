import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
  PredictTimestamp,
  PredictVenueId,
} from '../../../types';
import { useMarketHistory } from '../../../hooks/useMarketHistory';
import { createChartModel } from './chartModel';
import { PredictMarketHistory } from './PredictMarketHistory';
import { PredictMarketHistoryTestIds } from './PredictMarketHistory.testIds';

/**
 * Unit, not component-view: the contract is how many times the d3 path builder
 * runs. A view test only sees the painted chart, which looks the same either way.
 */
jest.mock('./chartModel', () => {
  const actual = jest.requireActual('./chartModel');
  return {
    ...actual,
    createChartModel: jest.fn(actual.createChartModel),
  };
});

jest.mock('../../../hooks/useMarketHistory', () => ({
  useMarketHistory: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;

const historyPoints = [
  {
    timestamp: '2026-09-17T09:00:00.000Z' as PredictTimestamp,
    yesPrice: '0.40' as PredictDecimal,
    noPrice: '0.60' as PredictDecimal,
  },
  {
    timestamp: '2026-09-17T10:00:00.000Z' as PredictTimestamp,
    yesPrice: '0.55' as PredictDecimal,
    noPrice: '0.45' as PredictDecimal,
  },
];

const market = {
  id: 'market-1' as PredictEntityId,
  question: 'Will it rain?',
  status: 'active',
  lastPrice: '0.55' as PredictDecimal,
  updatedAt: '2026-09-17T10:00:00.000Z' as PredictTimestamp,
  outcomes: [
    {
      id: 'market-1-yes' as PredictEntityId,
      side: 'yes',
      label: 'Yes',
    },
    {
      id: 'market-1-no' as PredictEntityId,
      side: 'no',
      label: 'No',
    },
  ],
} satisfies PredictMarket;

describe('PredictMarketHistory chart paths', () => {
  beforeEach(() => {
    jest.mocked(createChartModel).mockClear();
    jest.mocked(useMarketHistory).mockReturnValue({
      data: { points: historyPoints },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useMarketHistory>);
  });

  it('does not rebuild d3 paths when the Market object is unchanged', () => {
    const view = render(
      <PredictMarketHistory
        venueId={venueId}
        market={market}
        isStandardEvent
      />,
    );
    fireEvent(view.getByTestId(PredictMarketHistoryTestIds.CHART), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });
    const buildsAfterLayout = jest.mocked(createChartModel).mock.calls.length;

    view.rerender(
      <PredictMarketHistory
        venueId={venueId}
        market={market}
        isStandardEvent
      />,
    );

    expect(jest.mocked(createChartModel).mock.calls.length).toBe(
      buildsAfterLayout,
    );
  });

  it('rebuilds d3 paths when this Market quote changes', () => {
    const view = render(
      <PredictMarketHistory
        venueId={venueId}
        market={market}
        isStandardEvent
      />,
    );
    fireEvent(view.getByTestId(PredictMarketHistoryTestIds.CHART), 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });
    const buildsAfterLayout = jest.mocked(createChartModel).mock.calls.length;

    view.rerender(
      <PredictMarketHistory
        venueId={venueId}
        market={{
          ...market,
          lastPrice: '0.20' as PredictDecimal,
          updatedAt: '2026-09-17T12:00:00.000Z' as PredictTimestamp,
        }}
        isStandardEvent
      />,
    );

    expect(jest.mocked(createChartModel).mock.calls.length).toBe(
      buildsAfterLayout + 1,
    );
  });
});
