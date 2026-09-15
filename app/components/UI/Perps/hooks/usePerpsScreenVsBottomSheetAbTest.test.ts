import { renderHook } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  SCREEN_VS_BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
  SCREEN_VS_BOTTOM_SHEET_VARIANTS,
  ScreenVsBottomSheetVariant,
} from '../abTestConfig';
import { usePerpsScreenVsBottomSheetAbTest } from './usePerpsScreenVsBottomSheetAbTest';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);

describe('usePerpsScreenVsBottomSheetAbTest', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant:
        SCREEN_VS_BOTTOM_SHEET_VARIANTS[ScreenVsBottomSheetVariant.Control],
      variantName: ScreenVsBottomSheetVariant.Control,
      isActive: false,
    });
  });

  it('resolves assignment through useABTest with the shared flag and variants', () => {
    renderHook(() => usePerpsScreenVsBottomSheetAbTest());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
      SCREEN_VS_BOTTOM_SHEET_VARIANTS,
      SCREEN_VS_BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
    );
  });

  it('keeps screen presentation for control', () => {
    const { result } = renderHook(() => usePerpsScreenVsBottomSheetAbTest());

    expect(result.current.useBottomSheet).toBe(false);
  });

  it('keeps screen presentation when the control assignment is active', () => {
    mockUseABTest.mockReturnValue({
      variant:
        SCREEN_VS_BOTTOM_SHEET_VARIANTS[ScreenVsBottomSheetVariant.Control],
      variantName: ScreenVsBottomSheetVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsScreenVsBottomSheetAbTest());

    expect(result.current.useBottomSheet).toBe(false);
  });

  it('enables bottom-sheet presentation for the bottom-sheet experience', () => {
    mockUseABTest.mockReturnValue({
      variant:
        SCREEN_VS_BOTTOM_SHEET_VARIANTS[ScreenVsBottomSheetVariant.Treatment],
      variantName: ScreenVsBottomSheetVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsScreenVsBottomSheetAbTest());

    expect(result.current.useBottomSheet).toBe(true);
  });
});
