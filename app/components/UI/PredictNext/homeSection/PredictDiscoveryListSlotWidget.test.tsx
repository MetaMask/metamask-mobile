import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { UiSlot } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { useActiveVenue } from '../implementation/activeVenue';
import type { ActiveVenueResolution } from '../implementation/types';
import { PredictDiscoveryListSlotWidget } from './PredictDiscoveryListSlotWidget';

const mockLegacyWidget = jest.fn((_props: unknown) => null);
const mockNextDiscovery = jest.fn((_props: unknown) => null);

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));
jest.mock('../../Predict/uiSlots/widgets/PredictDiscoveryListWidget', () => ({
  PredictDiscoveryListWidget: (props: unknown) => mockLegacyWidget(props),
}));
jest.mock('./internal/next/NextHomeDiscovery', () => ({
  NextHomeDiscovery: (props: unknown) => mockNextDiscovery(props),
}));

const slotWith = (
  items: (
    | { type: 'event'; id: string; slug: string }
    | { type: 'series'; seriesId: 'btc-up-or-down-5m' }
  )[],
): UiSlot => ({
  slotId: 'wallet-home.predict-empty-state',
  contentId: 'predict-empty-state-1',
  revision: 1,
  widget: { type: 'predict-discovery-list', schemaVersion: 1, props: {} },
  dataReferences: [
    {
      id: 'markets',
      type: 'predict-homepage-market-slots',
      params: { venue: 'polymarket', items },
    },
  ],
});

const PINNED_EVENT = { type: 'event', id: '202857', slug: 'nfl' } as const;
const BTC = { type: 'series', seriesId: 'btc-up-or-down-5m' } as const;

const givenActiveVenue = (resolution: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(resolution);

describe('PredictDiscoveryListSlotWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the slot to the Polymarket discovery list unchanged', () => {
    givenActiveVenue({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
    });
    const slot = slotWith([PINNED_EVENT, BTC]);

    render(<PredictDiscoveryListSlotWidget slot={slot} />);

    expect(mockLegacyWidget).toHaveBeenCalledWith({ slot });
    expect(mockNextDiscovery).not.toHaveBeenCalled();
  });

  it('shows a next Venue only the slots a Feed can fill', () => {
    givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

    render(
      <PredictDiscoveryListSlotWidget slot={slotWith([PINNED_EVENT, BTC])} />,
    );

    expect(mockNextDiscovery).toHaveBeenCalledWith({
      slotIds: ['btc-up-down'],
    });
    expect(mockLegacyWidget).not.toHaveBeenCalled();
  });

  it.each([
    ['names only pinned Events', slotWith([PINNED_EVENT])],
    ['is the bundled fallback', undefined],
  ])(
    'shows a next Venue its default slots when the assignment %s',
    (_, slot) => {
      givenActiveVenue({ status: 'ready', venue: 'kalshi', source: 'rollout' });

      render(<PredictDiscoveryListSlotWidget slot={slot} />);

      expect(mockNextDiscovery).toHaveBeenCalledWith({ slotIds: undefined });
    },
  );

  it('renders nothing while the Active Venue resolves', () => {
    givenActiveVenue({ status: 'resolving' });

    render(<PredictDiscoveryListSlotWidget slot={slotWith([BTC])} />);

    expect(mockLegacyWidget).not.toHaveBeenCalled();
    expect(mockNextDiscovery).not.toHaveBeenCalled();
    expect(screen.toJSON()).toBeNull();
  });
});
