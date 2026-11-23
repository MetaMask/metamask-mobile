import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { selectPredictAvailability } from '../availability/selectPredictAvailability';
import { useVenueCapabilities } from '../capabilities/useVenueCapabilities';
import type { PredictVenueCapabilities } from '../capabilities/types';
import { useActiveVenue } from '../implementation/activeVenue';
import { NextVenueProvider } from '../implementation/NextVenueContext';
import type { ActiveVenueResolution } from '../implementation/types';
import type { PredictVenueAction, PredictVenueId } from '../types';
import { usePredictWithdrawAvailable } from './usePredictWithdrawAvailable';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // The composed selector is mocked below; the store is not under test.
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
}));
jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));
jest.mock('../availability/selectPredictAvailability', () => ({
  selectPredictAvailability: jest.fn(),
}));
jest.mock('../capabilities/useVenueCapabilities', () => ({
  useVenueCapabilities: jest.fn(),
}));

const KALSHI_ACTIVE: ActiveVenueResolution = {
  status: 'ready',
  venue: 'kalshi',
  source: 'rollout',
};
const KALSHI_ID = 'kalshi' as PredictVenueId;

const descriptor = (
  venueId: PredictVenueId,
  actions: PredictVenueAction[],
): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    venueId,
    actions,
    feeds: {},
    categories: [],
    searchSupported: false,
    screens: [],
    displayName: venueId,
  },
});

const renderWithdrawAvailable = ({
  activeVenue,
  available = true,
  capabilities,
  venueId = KALSHI_ID,
}: {
  activeVenue: ActiveVenueResolution;
  available?: boolean;
  capabilities: PredictVenueCapabilities;
  venueId?: PredictVenueId;
}) => {
  jest.mocked(useActiveVenue).mockReturnValue(activeVenue);
  jest.mocked(selectPredictAvailability).mockReturnValue(available);
  jest.mocked(useVenueCapabilities).mockReturnValue(capabilities);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextVenueProvider venueId={venueId}>{children}</NextVenueProvider>
  );
  return renderHook(() => usePredictWithdrawAvailable(), { wrapper });
};

describe('usePredictWithdrawAvailable', () => {
  it('is ready on Kalshi once its descriptor lists withdraw', () => {
    const { result } = renderWithdrawAvailable({
      activeVenue: KALSHI_ACTIVE,
      capabilities: descriptor(KALSHI_ID, ['buy', 'sell', 'withdraw']),
    });

    expect(result.current).toEqual({ status: 'ready', implementation: 'next' });
  });

  it('reads the capabilities of the Active Venue', () => {
    renderWithdrawAvailable({
      activeVenue: KALSHI_ACTIVE,
      capabilities: descriptor(KALSHI_ID, ['withdraw']),
    });

    expect(jest.mocked(useVenueCapabilities)).toHaveBeenCalledWith('kalshi');
  });

  it('is unsupported while the descriptor omits withdraw', () => {
    const { result } = renderWithdrawAvailable({
      activeVenue: KALSHI_ACTIVE,
      capabilities: descriptor(KALSHI_ID, ['buy', 'sell']),
    });

    expect(result.current).toEqual({
      status: 'unavailable',
      reason: 'unsupported',
    });
  });

  it('hides the entry point while the catalog is still loading', () => {
    const { result } = renderWithdrawAvailable({
      activeVenue: KALSHI_ACTIVE,
      capabilities: { status: 'loading' },
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('is unavailable while Predict as a whole is unavailable', () => {
    const { result } = renderWithdrawAvailable({
      activeVenue: KALSHI_ACTIVE,
      available: false,
      capabilities: descriptor(KALSHI_ID, ['withdraw']),
    });

    expect(result.current).toEqual({
      status: 'unavailable',
      reason: 'unavailable',
    });
  });

  it('is unavailable while the Active Venue resolves', () => {
    const { result } = renderWithdrawAvailable({
      activeVenue: { status: 'resolving' },
      capabilities: { status: 'loading' },
    });

    expect(result.current).toEqual({
      status: 'unavailable',
      reason: 'resolving',
    });
  });
});
