import { renderHook } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import {
  BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
  BOTTOM_SHEET_VARIANTS,
  BottomSheetVariant,
  PERPS_BOTTOM_SHEET_AB_TEST_KEY,
} from '../abTestConfig';
import { usePerpsBottomSheetAbTest } from './usePerpsBottomSheetAbTest';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);

describe('usePerpsBottomSheetAbTest', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant: BOTTOM_SHEET_VARIANTS[BottomSheetVariant.Control],
      variantName: BottomSheetVariant.Control,
      isActive: false,
    });
  });

  it('resolves assignment through useABTest with the shared flag and variants', () => {
    renderHook(() => usePerpsBottomSheetAbTest());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_BOTTOM_SHEET_AB_TEST_KEY,
      BOTTOM_SHEET_VARIANTS,
      BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
    );
  });

  it('keeps full-page presentation for control', () => {
    const { result } = renderHook(() => usePerpsBottomSheetAbTest());

    expect(result.current.useBottomSheet).toBe(false);
    expect(result.current.variant.presentation).toBe('fullPage');
    expect(result.current.variantName).toBe(BottomSheetVariant.Control);
  });

  it('enables bottom-sheet presentation for treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: BOTTOM_SHEET_VARIANTS[BottomSheetVariant.Treatment],
      variantName: BottomSheetVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsBottomSheetAbTest());

    expect(result.current.useBottomSheet).toBe(true);
    expect(result.current.variant.presentation).toBe('bottomSheet');
    expect(result.current.isActive).toBe(true);
  });

  it('forwards trackExposure false for assignment-only reads', () => {
    renderHook(() => usePerpsBottomSheetAbTest({ trackExposure: false }));

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_BOTTOM_SHEET_AB_TEST_KEY,
      BOTTOM_SHEET_VARIANTS,
      {
        ...BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
        trackExposure: false,
      },
    );
  });
});
