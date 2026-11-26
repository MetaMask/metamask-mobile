import { renderHook } from '@testing-library/react-native';
import { useVenueCapabilities } from '../../capabilities';
import type { PredictVenueCapabilities } from '../../capabilities/types';
import type { PredictVenueId } from '../../types';
import { useKalshiPayoutDestinationMode } from './useKalshiPayoutDestinationMode';

jest.mock('../../capabilities', () => ({
  ...jest.requireActual('../../capabilities'),
  useVenueCapabilities: jest.fn(),
}));

const venueId = 'kalshi' as PredictVenueId;
const resolve = (capabilities: PredictVenueCapabilities) => {
  jest.mocked(useVenueCapabilities).mockReturnValue(capabilities);
  return renderHook(() => useKalshiPayoutDestinationMode(venueId)).result
    .current;
};

describe('useKalshiPayoutDestinationMode', () => {
  it('fails closed for a catalog without an environment', () => {
    expect(
      resolve({
        status: 'ready',
        descriptor: {
          venueId,
          displayName: 'Kalshi',
          actions: [],
          feeds: {},
          categories: [],
          searchSupported: false,
          screens: [],
        },
      }),
    ).toEqual({ status: 'unavailable', reason: 'missing_environment' });
  });
  it('propagates loading and retryable errors', () => {
    expect(resolve({ status: 'loading' })).toEqual({ status: 'loading' });
    const retry = jest.fn();
    expect(resolve({ status: 'unavailable', reason: 'error', retry })).toEqual({
      status: 'unavailable',
      reason: 'error',
      retry,
    });
  });
});
