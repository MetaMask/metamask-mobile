import { renderHook } from '@testing-library/react-native';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { useCollectiblesPresentation } from './useCollectiblesPresentation';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

describe('useCollectiblesPresentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseNetworkTier.mockReturnValue(null);
  });

  it.each(['LOW', 'MID', 'HIGH', null] as const)(
    'uses normal presentation defaults for %s hardware with an unknown network',
    (hardware) => {
      mockGetHardwareTier.mockReturnValue(hardware);

      const { result } = renderHook(() => useCollectiblesPresentation());

      expect(result.current).toEqual({
        hardware,
        network: null,
        online: true,
        previewCount: 8,
        drawDistance: 350,
        animate: true,
      });
    },
  );

  it.each(['WIFI', 'SLOW_CELLULAR'] as const)(
    'reduces optional presentation on LOW hardware with %s transport',
    (network) => {
      mockGetHardwareTier.mockReturnValue('LOW');
      mockUseNetworkTier.mockReturnValue(network);

      const { result } = renderHook(() => useCollectiblesPresentation());

      expect(result.current).toEqual({
        hardware: 'LOW',
        network,
        online: true,
        previewCount: 4,
        drawDistance: 160,
        animate: false,
      });
    },
  );

  it('restores product defaults when the network tier becomes unknown', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseNetworkTier.mockReturnValue('WIFI');
    const { result, rerender } = renderHook(() =>
      useCollectiblesPresentation(),
    );

    mockUseNetworkTier.mockReturnValue(null);
    rerender({});

    expect(result.current).toMatchObject({
      network: null,
      online: true,
      previewCount: 8,
      drawDistance: 350,
      animate: true,
    });
  });

  it('reduces previews on slow networks without applying memory restrictions', () => {
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    const { result } = renderHook(() => useCollectiblesPresentation());

    expect(result.current).toEqual({
      hardware: 'HIGH',
      network: 'SLOW_CELLULAR',
      online: true,
      previewCount: 4,
      drawDistance: 350,
      animate: true,
    });
  });

  it('disables optional motion offline without applying memory restrictions', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    const { result } = renderHook(() => useCollectiblesPresentation());

    expect(result.current).toEqual({
      hardware: 'HIGH',
      network: 'NONE',
      online: false,
      previewCount: 8,
      drawDistance: 350,
      animate: false,
    });
  });
});
