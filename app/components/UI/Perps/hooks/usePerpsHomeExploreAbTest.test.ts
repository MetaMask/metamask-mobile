import { renderHook } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_HOME_EXPLORE_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_HOME_EXPLORE_AB_TEST_KEY,
  PERPS_HOME_EXPLORE_VARIANTS,
  PerpsHomeExploreVariant,
} from '../abTestConfig';
import { usePerpsHomeExploreAbTest } from './usePerpsHomeExploreAbTest';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);

describe('usePerpsHomeExploreAbTest', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_HOME_EXPLORE_VARIANTS[PerpsHomeExploreVariant.Control],
      variantName: PerpsHomeExploreVariant.Control,
      isActive: false,
    });
  });

  it('resolves assignment through useABTest with the explore flag and variants', () => {
    renderHook(() => usePerpsHomeExploreAbTest());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_HOME_EXPLORE_AB_TEST_KEY,
      PERPS_HOME_EXPLORE_VARIANTS,
      PERPS_HOME_EXPLORE_AB_TEST_EXPOSURE_OPTIONS,
    );
  });

  it('keeps the stacked sections for control and for an inactive assignment', () => {
    const { result } = renderHook(() => usePerpsHomeExploreAbTest());

    expect(result.current.showExploreTable).toBe(false);
    expect(result.current.variantName).toBe(PerpsHomeExploreVariant.Control);
    expect(result.current.isActive).toBe(false);
  });

  it('keeps the stacked sections when control is an active assignment', () => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_HOME_EXPLORE_VARIANTS[PerpsHomeExploreVariant.Control],
      variantName: PerpsHomeExploreVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsHomeExploreAbTest());

    expect(result.current.showExploreTable).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  it('shows the explore table for treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: PERPS_HOME_EXPLORE_VARIANTS[PerpsHomeExploreVariant.Treatment],
      variantName: PerpsHomeExploreVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsHomeExploreAbTest());

    expect(result.current.showExploreTable).toBe(true);
    expect(result.current.variantName).toBe(PerpsHomeExploreVariant.Treatment);
    expect(result.current.isActive).toBe(true);
  });

  it('falls back to the stacked sections when the variant payload is missing', () => {
    mockUseABTest.mockReturnValue({
      variant: undefined as never,
      variantName: PerpsHomeExploreVariant.Control,
      isActive: false,
    });

    const { result } = renderHook(() => usePerpsHomeExploreAbTest());

    expect(result.current.showExploreTable).toBe(false);
    expect(result.current.isActive).toBe(false);
  });
});
