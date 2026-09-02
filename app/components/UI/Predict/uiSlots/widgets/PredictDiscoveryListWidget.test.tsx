import React from 'react';
import { render } from '@testing-library/react-native';
import type { UiSlot } from '../../../../../core/Engine/controllers/ui-slots-controller/types';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../constants/btcUpDown5mSeries';
import { useHomepagePredictMarketSlots } from '../../../../Views/Homepage/Sections/Predictions/hooks';
import { PredictDiscoveryListHostProvider } from './PredictDiscoveryListContext';
import {
  PredictDiscoveryListWidget,
  resolveHomepagePredictMarketSlots,
} from './PredictDiscoveryListWidget';
import type { PredictHomepageMarketSlotReference } from '../types';

const mockHomepagePredictDiscovery = jest.fn((_props: unknown) => null);

jest.mock(
  '../../../../Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery',
  () => ({
    __esModule: true,
    default: (props: unknown) => mockHomepagePredictDiscovery(props),
  }),
);
jest.mock('../../../../Views/Homepage/Sections/Predictions/hooks', () => ({
  useHomepagePredictMarketSlots: jest.fn(),
}));
jest.mock(
  '../../../../Views/Homepage/Sections/Predictions/hooks/useTreatmentDiscoveryFeedsLoading',
  () => ({
    useTreatmentDiscoveryFeedsLoading: () => false,
  }),
);

const reference: PredictHomepageMarketSlotReference = {
  id: 'markets',
  type: 'predict-homepage-market-slots',
  params: {
    venue: 'polymarket',
    items: [
      { type: 'event', id: 'event-1', slug: 'event-one' },
      { type: 'series', seriesId: 'btc-up-or-down-5m' },
      { type: 'event', id: 'event-2', slug: 'event-two' },
    ],
  },
};

const slot: UiSlot = {
  slotId: 'wallet-home.predict-empty-state',
  contentId: 'predict-empty-state-1',
  revision: 1,
  widget: {
    type: 'predict-discovery-list',
    schemaVersion: 1,
    props: {},
  },
  dataReferences: [reference],
};

describe('PredictDiscoveryListWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useHomepagePredictMarketSlots).mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
  });

  it('maps validated remote items to domain slots in exact order', () => {
    const result = resolveHomepagePredictMarketSlots(reference);

    expect(result).toEqual([
      { type: 'event', id: 'event-1', slug: 'event-one' },
      { type: 'series', series: BTC_UP_OR_DOWN_5M_SERIES },
      { type: 'event', id: 'event-2', slug: 'event-two' },
    ]);
  });

  it('mounts one query for the resolved remote assignment', () => {
    const host = {
      enabled: true,
      title: 'Predictions',
      onViewAll: jest.fn(),
      headerTestIdKey: 'predictions' as const,
      registerDiscoveryRefetch: jest.fn(),
      reportDiscoveryLoading: jest.fn(),
    };

    render(
      <PredictDiscoveryListHostProvider value={host}>
        <PredictDiscoveryListWidget slot={slot} />
      </PredictDiscoveryListHostProvider>,
    );

    expect(useHomepagePredictMarketSlots).toHaveBeenCalledTimes(1);
    expect(useHomepagePredictMarketSlots).toHaveBeenCalledWith({
      enabled: true,
      slots: [
        { type: 'event', id: 'event-1', slug: 'event-one' },
        { type: 'series', series: BTC_UP_OR_DOWN_5M_SERIES },
        { type: 'event', id: 'event-2', slug: 'event-two' },
      ],
    });
    expect(mockHomepagePredictDiscovery).toHaveBeenCalledTimes(1);
  });

  it('keeps resolved slot identity stable across host rerenders', () => {
    const host = {
      enabled: true,
      title: 'Predictions',
      onViewAll: jest.fn(),
      headerTestIdKey: 'predictions' as const,
      registerDiscoveryRefetch: jest.fn(),
      reportDiscoveryLoading: jest.fn(),
    };
    const { rerender } = render(
      <PredictDiscoveryListHostProvider value={host}>
        <PredictDiscoveryListWidget slot={slot} />
      </PredictDiscoveryListHostProvider>,
    );
    const firstSlots = jest.mocked(useHomepagePredictMarketSlots).mock
      .calls[0][0].slots;

    rerender(
      <PredictDiscoveryListHostProvider
        value={{ ...host, title: 'Updated title' }}
      >
        <PredictDiscoveryListWidget slot={slot} />
      </PredictDiscoveryListHostProvider>,
    );

    const secondSlots = jest.mocked(useHomepagePredictMarketSlots).mock
      .calls[1][0].slots;
    expect(secondSlots).toBe(firstSlots);
  });
});
