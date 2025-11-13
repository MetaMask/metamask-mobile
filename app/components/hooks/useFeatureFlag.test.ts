import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useFeatureFlagOverride } from '../../contexts/FeatureFlagOverrideContext';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../contexts/FeatureFlagOverrideContext', () => ({
  useFeatureFlagOverride: jest.fn(),
}));

// Mock the useFeatureFlag module with mocked FeatureFlagNames enum
jest.mock('./useFeatureFlag', () => {
  const actual = jest.requireActual('./useFeatureFlag');
  return {
    ...actual,
    FeatureFlagNames: {
      mockedFlagEnabled: 'mockedFlagEnabled',
    } as typeof actual.FeatureFlagNames,
  };
});

import { useFeatureFlag, FeatureFlagNames } from './useFeatureFlag';

// Type for the mocked FeatureFlagNames enum
type MockedFeatureFlagNames = typeof FeatureFlagNames & {
  mockedFlagEnabled: 'mockedFlagEnabled';
};

// Create a typed reference to the mocked flag
const MOCKED_FLAG = (FeatureFlagNames as MockedFeatureFlagNames)
  .mockedFlagEnabled as FeatureFlagNames;

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseFeatureFlagOverride =
  useFeatureFlagOverride as jest.MockedFunction<typeof useFeatureFlagOverride>;

describe('useFeatureFlag', () => {
  let mockGetFeatureFlag: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetFeatureFlag = jest.fn();
    mockUseFeatureFlagOverride.mockReturnValue({
      getFeatureFlag: mockGetFeatureFlag,
    } as unknown as ReturnType<typeof useFeatureFlagOverride>);
  });

  describe('when basic functionality is disabled', () => {
    it('returns false without calling getFeatureFlag', () => {
      mockUseSelector.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockUseSelector).toHaveBeenCalledWith(
        selectBasicFunctionalityEnabled,
      );
      expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    });
  });

  describe('when basic functionality is enabled', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(true);
    });

    it('returns true when getFeatureFlag returns true', () => {
      mockGetFeatureFlag.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(true);
      expect(mockGetFeatureFlag).toHaveBeenCalledWith(MOCKED_FLAG);
      expect(mockGetFeatureFlag).toHaveBeenCalledTimes(1);
    });

    it('returns false when getFeatureFlag returns false', () => {
      mockGetFeatureFlag.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockGetFeatureFlag).toHaveBeenCalledWith(MOCKED_FLAG);
      expect(mockGetFeatureFlag).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when getFeatureFlag returns undefined', () => {
      mockGetFeatureFlag.mockReturnValue(undefined);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBeUndefined();
      expect(mockGetFeatureFlag).toHaveBeenCalledWith(MOCKED_FLAG);
      expect(mockGetFeatureFlag).toHaveBeenCalledTimes(1);
    });

    it('calls getFeatureFlag with the correct feature flag key', () => {
      mockGetFeatureFlag.mockReturnValue(true);

      renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(mockGetFeatureFlag).toHaveBeenCalledWith(MOCKED_FLAG);
    });

    it('calls useSelector with selectBasicFunctionalityEnabled selector', () => {
      mockGetFeatureFlag.mockReturnValue(true);

      renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(mockUseSelector).toHaveBeenCalledWith(
        selectBasicFunctionalityEnabled,
      );
      expect(mockUseSelector).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('returns false when basic functionality is null', () => {
      mockUseSelector.mockReturnValue(null as unknown as boolean);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    });

    it('returns false when basic functionality is undefined', () => {
      mockUseSelector.mockReturnValue(undefined as unknown as boolean);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    });

    it('returns false when basic functionality is 0', () => {
      mockUseSelector.mockReturnValue(0 as unknown as boolean);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    });

    it('returns false when basic functionality is empty string', () => {
      mockUseSelector.mockReturnValue('' as unknown as boolean);

      const { result } = renderHook(() => useFeatureFlag(MOCKED_FLAG));

      expect(result.current).toBe(false);
      expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    });
  });
});
