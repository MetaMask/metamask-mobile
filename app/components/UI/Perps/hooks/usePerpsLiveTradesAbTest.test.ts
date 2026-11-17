import { renderHook } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_LIVE_TRADES_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_LIVE_TRADES_AB_TEST_KEY,
  PERPS_LIVE_TRADES_VARIANTS,
  PerpsLiveTradesVariant,
} from '../abTestConfig';
import { usePerpsLiveTradesAbTest } from './usePerpsLiveTradesAbTest';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);

describe('usePerpsLiveTradesAbTest', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_LIVE_TRADES_VARIANTS[PerpsLiveTradesVariant.Control],
      variantName: PerpsLiveTradesVariant.Control,
      isActive: false,
    });
  });

  it('resolves assignment through useABTest with the live trades flag and variants', () => {
    renderHook(() => usePerpsLiveTradesAbTest());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_LIVE_TRADES_AB_TEST_KEY,
      PERPS_LIVE_TRADES_VARIANTS,
      PERPS_LIVE_TRADES_AB_TEST_EXPOSURE_OPTIONS,
    );
  });

  it('hides Live trades for control and for an inactive assignment', () => {
    const { result } = renderHook(() => usePerpsLiveTradesAbTest());

    expect(result.current.showLiveTrades).toBe(false);
    expect(result.current.variantName).toBe(PerpsLiveTradesVariant.Control);
    expect(result.current.isActive).toBe(false);
  });

  it('hides Live trades when control is an active assignment', () => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_LIVE_TRADES_VARIANTS[PerpsLiveTradesVariant.Control],
      variantName: PerpsLiveTradesVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsLiveTradesAbTest());

    expect(result.current.showLiveTrades).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  it('shows Live trades for treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_LIVE_TRADES_VARIANTS[PerpsLiveTradesVariant.Treatment],
      variantName: PerpsLiveTradesVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsLiveTradesAbTest());

    expect(result.current.showLiveTrades).toBe(true);
    expect(result.current.variantName).toBe(PerpsLiveTradesVariant.Treatment);
    expect(result.current.isActive).toBe(true);
  });

  it('hides Live trades when the variant payload is missing', () => {
    mockUseABTest.mockReturnValue({
      variant: undefined as never,
      variantName: PerpsLiveTradesVariant.Control,
      isActive: false,
    });

    const { result } = renderHook(() => usePerpsLiveTradesAbTest());

    expect(result.current.showLiveTrades).toBe(false);
    expect(result.current.isActive).toBe(false);
  });
});
