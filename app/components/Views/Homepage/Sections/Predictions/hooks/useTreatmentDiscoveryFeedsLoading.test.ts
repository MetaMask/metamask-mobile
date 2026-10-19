import { renderHook, act } from '@testing-library/react-native';
import { useTreatmentDiscoveryFeedsLoading } from './useTreatmentDiscoveryFeedsLoading';

describe('useTreatmentDiscoveryFeedsLoading', () => {
  it('returns false when not in treatment discovery', () => {
    const { result } = renderHook(() =>
      useTreatmentDiscoveryFeedsLoading({
        isTreatmentDiscovery: false,
        isDiscoveryFetching: true,
      }),
    );

    expect(result.current).toBe(false);
  });

  it('returns true until World Cup feeds have settled at least once', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useTreatmentDiscoveryFeedsLoading>[0]) =>
        useTreatmentDiscoveryFeedsLoading(props),
      {
        initialProps: {
          isTreatmentDiscovery: true,
          isDiscoveryFetching: true,
        },
      },
    );

    expect(result.current).toBe(true);

    rerender({
      isTreatmentDiscovery: true,
      isDiscoveryFetching: false,
    });

    expect(result.current).toBe(false);
  });

  it('resets to loading when treatment discovery is turned off and on again', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useTreatmentDiscoveryFeedsLoading>[0]) =>
        useTreatmentDiscoveryFeedsLoading(props),
      {
        initialProps: {
          isTreatmentDiscovery: true,
          isDiscoveryFetching: false,
        },
      },
    );

    expect(result.current).toBe(false);

    rerender({
      isTreatmentDiscovery: false,
      isDiscoveryFetching: false,
    });

    rerender({
      isTreatmentDiscovery: true,
      isDiscoveryFetching: true,
    });

    expect(result.current).toBe(true);

    rerender({
      isTreatmentDiscovery: true,
      isDiscoveryFetching: false,
    });

    expect(result.current).toBe(false);
  });
});
