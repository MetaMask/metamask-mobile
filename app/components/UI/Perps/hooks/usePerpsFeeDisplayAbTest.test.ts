import { renderHook } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import {
  FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS,
  FEE_DISPLAY_AB_TEST_KEY,
  FEE_DISPLAY_VARIANTS,
  FeeDisplayVariant,
} from '../abTestConfig';
import { usePerpsFeeDisplayAbTest } from './usePerpsFeeDisplayAbTest';

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseABTest = jest.mocked(useABTest);

describe('usePerpsFeeDisplayAbTest', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      variant: FEE_DISPLAY_VARIANTS[FeeDisplayVariant.Control],
      variantName: FeeDisplayVariant.Control,
      isActive: false,
    });
  });

  it('resolves assignment through useABTest with the fee display flag and variants', () => {
    renderHook(() => usePerpsFeeDisplayAbTest());

    expect(mockUseABTest).toHaveBeenCalledWith(
      FEE_DISPLAY_AB_TEST_KEY,
      FEE_DISPLAY_VARIANTS,
      FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS,
    );
  });

  it('keeps the dollar fee display for control and for an inactive assignment', () => {
    const { result } = renderHook(() => usePerpsFeeDisplayAbTest());

    expect(result.current.feeDisplayMode).toBe('dollar');
    expect(result.current.variantName).toBe(FeeDisplayVariant.Control);
    expect(result.current.isActive).toBe(false);
  });

  it('keeps the dollar fee display when control is an active assignment', () => {
    mockUseABTest.mockReturnValue({
      variant: FEE_DISPLAY_VARIANTS[FeeDisplayVariant.Control],
      variantName: FeeDisplayVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsFeeDisplayAbTest());

    expect(result.current.feeDisplayMode).toBe('dollar');
    expect(result.current.isActive).toBe(true);
  });

  it('shows the taker/maker percentage display for an active treatment assignment', () => {
    mockUseABTest.mockReturnValue({
      variant: FEE_DISPLAY_VARIANTS[FeeDisplayVariant.Treatment],
      variantName: FeeDisplayVariant.Treatment,
      isActive: true,
    });

    const { result } = renderHook(() => usePerpsFeeDisplayAbTest());

    expect(result.current.feeDisplayMode).toBe('percentage');
    expect(result.current.variantName).toBe(FeeDisplayVariant.Treatment);
    expect(result.current.isActive).toBe(true);
  });

  it('falls back to the dollar fee display when the variant payload is missing', () => {
    mockUseABTest.mockReturnValue({
      variant: undefined as never,
      variantName: FeeDisplayVariant.Control,
      isActive: false,
    });

    const { result } = renderHook(() => usePerpsFeeDisplayAbTest());

    expect(result.current.feeDisplayMode).toBe('dollar');
    expect(result.current.isActive).toBe(false);
  });
});
