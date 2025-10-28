import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockSelectors = ({
  displayCardButtonFeatureFlag,
  alwaysShowCardButton,
}: {
  displayCardButtonFeatureFlag: boolean | null | undefined;
  alwaysShowCardButton: boolean | null | undefined;
}) => {
  mockUseSelector
    .mockReturnValueOnce(displayCardButtonFeatureFlag)
    .mockReturnValueOnce(alwaysShowCardButton);
};

describe('useIsBaanxLoginEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when both flags are null', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: null,
      alwaysShowCardButton: null,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when both flags are undefined', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: undefined,
      alwaysShowCardButton: undefined,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('returns false when both flags are disabled', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: false,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);
  });

  it('returns true when feature flag is enabled and experimental switch is disabled', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: true,
      alwaysShowCardButton: false,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
  });

  it('returns true when experimental switch is enabled and feature flag is disabled', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: true,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
  });

  it('returns true when both flags are enabled', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: true,
      alwaysShowCardButton: true,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
  });

  it('returns true when experimental switch is enabled regardless of feature flag state', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: true,
    });

    const { result } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(true);
  });

  it('updates when flag values change', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: false,
    });
    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);

    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: true,
    });
    rerender();

    expect(result.current).toBe(true);
  });
});
