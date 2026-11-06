import { renderHook } from '@testing-library/react-native';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../../util/deviceCapability/types';
import { useTrendingLiveDataAllowed } from './useTrendingLiveDataAllowed';

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));
jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

describe('useTrendingLiveDataAllowed', () => {
  it.each<[HardwareTier | null, NetworkTier | null, boolean]>([
    ['HIGH', 'NONE', false],
    [null, 'NONE', false],
    ['LOW', 'SLOW_CELLULAR', false],
    ['LOW', 'WIFI', true],
    ['LOW', null, true],
    ['MID', 'SLOW_CELLULAR', true],
    ['HIGH', 'WIFI', true],
    [null, null, true],
  ])(
    '%s hardware on %s network allows live data: %s',
    (hardware, network, allowed) => {
      jest.mocked(getHardwareTier).mockReturnValue(hardware);
      jest.mocked(useNetworkTier).mockReturnValue(network);

      const { result } = renderHook(() => useTrendingLiveDataAllowed());

      expect(result.current).toBe(allowed);
    },
  );
});
