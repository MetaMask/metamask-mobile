import React from 'react';
import {
  renderHook,
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Text } from 'react-native';
import {
  FeatureFlagOverrideProvider,
  useFeatureFlagOverride,
} from './FeatureFlagOverrideContext';
import {
  FeatureFlagType,
  getFeatureFlagType,
  isMinimumRequiredVersionSupported,
} from '../util/feature-flags';
import {
  selectRemoteFeatureFlags,
  selectLocalOverrides,
  selectRawFeatureFlags,
} from '../selectors/featureFlagController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockSetFlagOverride = jest.fn();
const mockRemoveFlagOverride = jest.fn();
const mockClearAllFlagOverrides = jest.fn();

jest.mock('../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RemoteFeatureFlagController: {
        setFlagOverride: (...args: unknown[]) => mockSetFlagOverride(...args),
        removeFlagOverride: (...args: unknown[]) =>
          mockRemoveFlagOverride(...args),
        clearAllFlagOverrides: (...args: unknown[]) =>
          mockClearAllFlagOverrides(...args),
      },
    },
  },
}));

jest.mock('../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(),
  selectLocalOverrides: jest.fn(),
  selectRawFeatureFlags: jest.fn(),
}));

jest.mock('../util/feature-flags', () => ({
  ...jest.requireActual('../util/feature-flags'),
  getFeatureFlagDescription: jest.fn(),
  getFeatureFlagType: jest.fn(),
  isMinimumRequiredVersionSupported: jest.fn(),
}));

// Mock the ToastContext to avoid dependency issues
jest.mock('../component-library/components/Toast', () => {
  const React = jest.requireActual('react');
  return {
    ToastContext: React.createContext({
      toastRef: { current: { showToast: jest.fn() } },
    }),
    ToastVariants: {
      Plain: 'Plain',
      Account: 'Account',
      Network: 'Network',
      App: 'App',
      Icon: 'Icon',
    },
  };
});

// Mock useMetrics hook
const mockAddTraitsToUser = jest.fn();
jest.mock('../components/hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    addTraitsToUser: mockAddTraitsToUser,
  })),
}));

describe('FeatureFlagOverrideContext', () => {
  let mockUseSelector: jest.MockedFunction<typeof useSelector>;
  let mockGetFeatureFlagType: jest.MockedFunction<typeof getFeatureFlagType>;
  let mockIsMinimumRequiredVersionSupported: jest.MockedFunction<
    typeof isMinimumRequiredVersionSupported
  >;
  // State to track overrides for simulation
  let currentOverrides: Record<string, unknown>;
  let currentRawFlags: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddTraitsToUser.mockClear();
    mockSetFlagOverride.mockClear();
    mockRemoveFlagOverride.mockClear();
    mockClearAllFlagOverrides.mockClear();
    mockUseSelector = jest.mocked(useSelector);
    mockGetFeatureFlagType = jest.mocked(getFeatureFlagType);
    mockIsMinimumRequiredVersionSupported = jest.mocked(
      isMinimumRequiredVersionSupported,
    );

    // Reset state
    currentOverrides = {};
    currentRawFlags = {};

    // Default mock implementations
    mockIsMinimumRequiredVersionSupported.mockReturnValue(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetFeatureFlagType.mockImplementation((value: any) => {
      if (typeof value === 'boolean') return FeatureFlagType.FeatureFlagBoolean;
      if (typeof value === 'string') return FeatureFlagType.FeatureFlagString;
      if (typeof value === 'number') return FeatureFlagType.FeatureFlagNumber;
      if (Array.isArray(value)) return FeatureFlagType.FeatureFlagArray;
      if (typeof value === 'object' && value !== null)
        return FeatureFlagType.FeatureFlagObject;
      return FeatureFlagType.FeatureFlagString;
    });

    // Setup Engine mock implementations to update state
    mockSetFlagOverride.mockImplementation((key: string, value: unknown) => {
      currentOverrides[key] = value;
    });

    mockRemoveFlagOverride.mockImplementation((key: string) => {
      delete currentOverrides[key];
    });

    mockClearAllFlagOverrides.mockImplementation(() => {
      currentOverrides = {};
    });
  });

  /**
   * Helper to setup useSelector mock for the three selectors
   */
  const setupSelectorMocks = (rawFlags: Record<string, unknown>) => {
    currentRawFlags = rawFlags;
    currentOverrides = {};

    // We need to identify which selector is being used
    // by comparing the selector function directly
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRemoteFeatureFlags) {
        // Return raw flags merged with overrides
        return { ...currentRawFlags, ...currentOverrides };
      }
      if (selector === selectLocalOverrides) {
        return { ...currentOverrides };
      }
      if (selector === selectRawFeatureFlags) {
        return currentRawFlags;
      }
      return undefined;
    });
  };

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <FeatureFlagOverrideProvider>{children}</FeatureFlagOverrideProvider>
  );

  const createMockFeatureFlags = () => ({
    testFlag1: true,
    testFlag2: 'test value',
    testFlag3: 42,
    testFlag4: ['item1', 'item2'],
    testFlag5: { key: 'value' },
  });

  describe('FeatureFlagOverrideProvider', () => {
    it('provides initial context with empty overrides', () => {
      const mockFlags = createMockFeatureFlags();
      setupSelectorMocks(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.originalFlags).toEqual(mockFlags);
      expect(result.current.overrides).toEqual({});
      expect(result.current.getOverrideCount()).toBe(0);
      expect(Object.keys(result.current.featureFlags)).toHaveLength(5);
    });

    it('returns flag value directly from getFeatureFlag', () => {
      const mockFlags = { testFlag: true };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBoolean,
      );

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      const flagValue = result.current.getFeatureFlag('testFlag');
      expect(flagValue).toBe(true);
    });

    it('sorts feature flags list alphabetically by key', () => {
      const mockFlags = {
        zFlag: true,
        aFlag: false,
        mFlag: 'test',
      };
      setupSelectorMocks(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      const keys = result.current.featureFlagsList.map((flag) => flag.key);
      expect(keys).toEqual(['aFlag', 'mFlag', 'zFlag']);
    });

    it('handles empty feature flags from Redux', () => {
      setupSelectorMocks({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.originalFlags).toEqual({});
      expect(result.current.featureFlags).toEqual({});
      expect(result.current.featureFlagsList).toEqual([]);
    });
  });

  describe('Override Management', () => {
    it('sets override for existing flag', () => {
      const mockFlags = { testFlag: true };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', false);
      });

      // Verify Engine method was called
      expect(mockSetFlagOverride).toHaveBeenCalledWith('testFlag', false);

      // Rerender to pick up state changes
      rerender(null);

      expect(result.current.hasOverride('testFlag')).toBe(true);
      expect(result.current.overrides.testFlag).toBe(false);
      expect(result.current.getOverrideCount()).toBe(1);
      expect(result.current.getFeatureFlag('testFlag')).toBe(false);
      expect(result.current.featureFlags.testFlag.isOverridden).toBe(true);
    });

    it('sets override for non-existing flag', () => {
      setupSelectorMocks({});

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('newFlag', 'new value');
      });

      // Verify Engine method was called
      expect(mockSetFlagOverride).toHaveBeenCalledWith('newFlag', 'new value');

      // Rerender to pick up state changes
      rerender(null);

      expect(result.current.hasOverride('newFlag')).toBe(true);
      expect(result.current.overrides.newFlag).toBe('new value');
      expect(result.current.getFeatureFlag('newFlag')).toBe('new value');
      expect(result.current.featureFlags.newFlag.originalValue).toBeUndefined();
      expect(result.current.featureFlags.newFlag.isOverridden).toBe(true);
    });

    it('removes override and restores original value', () => {
      const mockFlags = { testFlag: true };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', false);
      });

      rerender(null);
      expect(result.current.getFeatureFlag('testFlag')).toBe(false);

      act(() => {
        result.current.removeOverride('testFlag');
      });

      // Verify Engine method was called
      expect(mockRemoveFlagOverride).toHaveBeenCalledWith('testFlag');

      rerender(null);

      expect(result.current.hasOverride('testFlag')).toBe(false);
      expect(result.current.overrides.testFlag).toBeUndefined();
      expect(result.current.getFeatureFlag('testFlag')).toBe(true);
      expect(result.current.featureFlags.testFlag.isOverridden).toBe(false);
    });

    it('removes non-existing override without error', () => {
      setupSelectorMocks({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(() => {
        act(() => {
          result.current.removeOverride('nonExistentFlag');
        });
      }).not.toThrow();

      expect(result.current.getOverrideCount()).toBe(0);
    });

    it('clears all overrides', () => {
      const mockFlags = { flag1: true, flag2: false };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', false);
        result.current.setOverride('flag2', true);
        result.current.setOverride('flag3', 'new');
      });

      rerender(null);
      expect(result.current.getOverrideCount()).toBe(3);

      act(() => {
        result.current.clearAllOverrides();
      });

      // Verify Engine method was called
      expect(mockClearAllFlagOverrides).toHaveBeenCalled();

      rerender(null);

      expect(result.current.getOverrideCount()).toBe(0);
      expect(result.current.hasOverride('flag1')).toBe(false);
      expect(result.current.hasOverride('flag2')).toBe(false);
      expect(result.current.hasOverride('flag3')).toBe(false);
      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.getFeatureFlag('flag2')).toBe(false);
    });

    it('updates multiple overrides independently', () => {
      const mockFlags = { flag1: 'original1', flag2: 'original2' };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', 'override1');
      });

      rerender(null);
      expect(result.current.getFeatureFlag('flag1')).toBe('override1');
      expect(result.current.getFeatureFlag('flag2')).toBe('original2');

      act(() => {
        result.current.setOverride('flag2', 'override2');
      });

      rerender(null);
      expect(result.current.getFeatureFlag('flag1')).toBe('override1');
      expect(result.current.getFeatureFlag('flag2')).toBe('override2');

      act(() => {
        result.current.setOverride('flag1', 'updated1');
      });

      rerender(null);
      expect(result.current.getFeatureFlag('flag1')).toBe('updated1');
      expect(result.current.getFeatureFlag('flag2')).toBe('override2');
    });
  });

  describe('Context Methods', () => {
    it('getAllOverrides returns copy of overrides object', () => {
      setupSelectorMocks({});

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', 'value1');
        result.current.setOverride('flag2', 'value2');
      });

      rerender(null);

      expect(result.current.overrides).toEqual({
        flag1: 'value1',
        flag2: 'value2',
      });

      // Capture the current overrides reference
      const previousOverrides = result.current.overrides;

      // Make another override
      act(() => {
        result.current.setOverride('flag3', 'modified');
      });

      // The previously captured overrides should still have the old values
      expect(previousOverrides).toEqual({
        flag1: 'value1',
        flag2: 'value2',
      });
    });

    it('hasOverride returns correct boolean values', () => {
      setupSelectorMocks({});

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.hasOverride('nonExistent')).toBe(false);

      act(() => {
        result.current.setOverride('existing', 'value');
      });

      rerender(null);

      expect(result.current.hasOverride('existing')).toBe(true);
      expect(result.current.hasOverride('nonExistent')).toBe(false);
    });

    it('getOverride returns correct values', () => {
      setupSelectorMocks({});

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.overrides.nonExistent).toBeUndefined();

      act(() => {
        result.current.setOverride('stringFlag', 'string value');
        result.current.setOverride('numberFlag', 42);
        result.current.setOverride('booleanFlag', false);
        result.current.setOverride('nullFlag', null);
      });

      rerender(null);

      expect(result.current.overrides.stringFlag).toBe('string value');
      expect(result.current.overrides.numberFlag).toBe(42);
      expect(result.current.overrides.booleanFlag).toBe(false);
      expect(result.current.overrides.nullFlag).toBeNull();
    });

    it('getOverrideCount returns correct count', () => {
      setupSelectorMocks({});

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getOverrideCount()).toBe(0);

      act(() => {
        result.current.setOverride('flag1', 'value1');
      });

      rerender(null);
      expect(result.current.getOverrideCount()).toBe(1);

      act(() => {
        result.current.setOverride('flag2', 'value2');
        result.current.setOverride('flag3', 'value3');
      });

      rerender(null);
      expect(result.current.getOverrideCount()).toBe(3);

      act(() => {
        result.current.removeOverride('flag1');
      });

      rerender(null);
      expect(result.current.getOverrideCount()).toBe(2);

      act(() => {
        result.current.clearAllOverrides();
      });

      rerender(null);
      expect(result.current.getOverrideCount()).toBe(0);
    });
  });

  describe('Feature Flag Processing', () => {
    it('processes flags with different types correctly', () => {
      const mockFlags = {
        booleanFlag: true,
        stringFlag: 'test',
        numberFlag: 42,
        arrayFlag: [1, 2, 3],
        objectFlag: { key: 'value' },
      };
      setupSelectorMocks(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(mockGetFeatureFlagType).toHaveBeenCalledWith(true);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith('test');
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith(42);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith([1, 2, 3]);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith({ key: 'value' });

      expect(result.current.featureFlags.booleanFlag.type).toBe(
        FeatureFlagType.FeatureFlagBoolean,
      );
      expect(result.current.featureFlags.stringFlag.type).toBe('string');
      expect(result.current.featureFlags.numberFlag.type).toBe('number');
      expect(result.current.featureFlags.arrayFlag.type).toBe('array');
      expect(result.current.featureFlags.objectFlag.type).toBe('object');
    });

    it('handles flags with null/undefined values', () => {
      const mockFlags = {
        nullFlag: null,
        undefinedFlag: undefined,
      };
      setupSelectorMocks(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('nullFlag')).toBeNull();
      expect(result.current.getFeatureFlag('undefinedFlag')).toBeUndefined();
    });

    it('uses original value for type determination when current value is null/undefined', () => {
      const mockFlags = { testFlag: 'original' };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', null);
      });

      rerender(null);

      // Should call getFeatureFlagType with original value when current is null
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith('original');
    });
  });

  describe('React State Management', () => {
    it('updates featureFlags when Redux state changes', () => {
      const initialFlags = { flag1: true };
      setupSelectorMocks(initialFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.featureFlagsList).toHaveLength(1);

      // Change Redux state (update currentRawFlags directly)
      currentRawFlags = { flag1: true, flag2: false };

      rerender(null);

      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.getFeatureFlag('flag2')).toBe(false);
      expect(result.current.featureFlagsList).toHaveLength(2);
    });

    it('preserves overrides when Redux state changes', () => {
      const initialFlags = { flag1: true };
      setupSelectorMocks(initialFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', false);
      });

      rerender(null);
      expect(result.current.getFeatureFlag('flag1')).toBe(false);

      // Change Redux state (update currentRawFlags directly)
      currentRawFlags = { flag1: true, flag2: 'new' };

      rerender(null);

      // Override should be preserved
      expect(result.current.getFeatureFlag('flag1')).toBe(false);
      expect(result.current.featureFlags.flag1.isOverridden).toBe(true);
      expect(result.current.getFeatureFlag('flag2')).toBe('new');
      expect(result.current.featureFlags.flag2.isOverridden).toBe(false);
    });
  });

  describe('useFeatureFlagOverride hook', () => {
    const TestComponent = () => {
      const context = useFeatureFlagOverride();
      return <Text>{`Override count: ${context.getOverrideCount()}`}</Text>;
    };

    it('throws error when used outside provider', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn);

      expect(() => {
        render(<TestComponent />);
      }).toThrow(
        'useFeatureFlagOverride must be used within a FeatureFlagOverrideProvider',
      );

      consoleSpy.mockRestore();
    });

    it('returns context value when used inside provider', () => {
      setupSelectorMocks({});

      render(
        <FeatureFlagOverrideProvider>
          <TestComponent />
        </FeatureFlagOverrideProvider>,
      );

      expect(screen.getByText('Override count: 0')).toBeTruthy();
    });

    it('calls Engine setFlagOverride when setOverride is invoked', () => {
      setupSelectorMocks({ testFlag: true });

      const TestComponentWithOverride = () => {
        const context = useFeatureFlagOverride();

        const handlePress = () => {
          context.setOverride('newFlag', 'value');
        };

        return (
          <>
            <Text>{`Override count: ${context.getOverrideCount()}`}</Text>
            <Text onPress={handlePress}>Add Override</Text>
          </>
        );
      };

      render(
        <FeatureFlagOverrideProvider>
          <TestComponentWithOverride />
        </FeatureFlagOverrideProvider>,
      );

      expect(screen.getByText('Override count: 0')).toBeTruthy();

      act(() => {
        screen.getByText('Add Override').props.onPress();
      });

      // Verify Engine method was called
      expect(mockSetFlagOverride).toHaveBeenCalledWith('newFlag', 'value');
    });
  });

  describe('getFeatureFlag Method', () => {
    it('returns undefined for non-existent flags', () => {
      setupSelectorMocks({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('nonExistentFlag')).toBeUndefined();
    });

    it('returns enabled value for boolean with minimumVersion flags when version is supported', () => {
      const mockFlags = {
        testFlag: { enabled: true, minimumVersion: '1.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(true);
    });

    it('returns false for boolean with minimumVersion flags when enabled is false and version is supported', () => {
      const mockFlags = {
        testFlag: { enabled: false, minimumVersion: '1.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(false);
    });

    it('returns false for boolean with minimumVersion flags when version is not supported in non-production', () => {
      const originalNodeEnv = process.env.METAMASK_ENVIRONMENT;
      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: 'development',
        configurable: true,
      });

      const mockFlags = {
        testFlag: { enabled: true, minimumVersion: '99.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(false);

      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: originalNodeEnv,
        configurable: true,
      });
    });

    it('returns false for boolean with minimumVersion flags when version is not supported in production', () => {
      const originalNodeEnv = process.env.METAMASK_ENVIRONMENT;
      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: 'production',
        configurable: true,
      });

      const mockFlags = {
        testFlag: { enabled: true, minimumVersion: '99.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(false);

      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: originalNodeEnv,
        configurable: true,
      });
    });

    it('returns enabled value for boolean with minimumVersion flags when enabled is false', () => {
      const mockFlags = {
        testFlag: { enabled: false, minimumVersion: '99.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(false);
    });

    it('returns flag value directly for non-boolean with minimumVersion flags', () => {
      const mockFlags = {
        stringFlag: 'test value',
        numberFlag: 42,
        booleanFlag: true,
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType
        .mockReturnValueOnce(FeatureFlagType.FeatureFlagString)
        .mockReturnValueOnce(FeatureFlagType.FeatureFlagNumber)
        .mockReturnValueOnce(FeatureFlagType.FeatureFlagBoolean);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('stringFlag')).toBe('test value');
      expect(result.current.getFeatureFlag('numberFlag')).toBe(42);
      expect(result.current.getFeatureFlag('booleanFlag')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('handles mix of original flags, overrides, and new flags', () => {
      const mockFlags = {
        original1: 'value1',
        original2: 'value2',
      };
      setupSelectorMocks(mockFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('original1', 'modified1'); // Override existing
        result.current.setOverride('new1', 'newValue1'); // Add new
        // original2 remains unchanged
      });

      rerender(null);

      const allFlags = result.current.featureFlagsList;
      expect(allFlags).toHaveLength(3);

      expect(result.current.getFeatureFlag('original1')).toBe('modified1');
      expect(result.current.featureFlags.original1.originalValue).toBe(
        'value1',
      );
      expect(result.current.featureFlags.original1.isOverridden).toBe(true);

      expect(result.current.getFeatureFlag('original2')).toBe('value2');
      expect(result.current.featureFlags.original2.originalValue).toBe(
        'value2',
      );
      expect(result.current.featureFlags.original2.isOverridden).toBe(false);

      expect(result.current.getFeatureFlag('new1')).toBe('newValue1');
      expect(result.current.featureFlags.new1.originalValue).toBeUndefined();
      expect(result.current.featureFlags.new1.isOverridden).toBe(true);
    });

    it('handles rapid override changes', () => {
      setupSelectorMocks({ testFlag: 'original' });

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', 'change1');
        result.current.setOverride('testFlag', 'change2');
        result.current.setOverride('testFlag', 'change3');
      });

      rerender(null);

      expect(result.current.getFeatureFlag('testFlag')).toBe('change3');
      expect(result.current.getOverrideCount()).toBe(1);
    });

    it('handles edge case with empty string keys', () => {
      setupSelectorMocks({ '': 'empty key value' });

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('')).toBe('empty key value');

      act(() => {
        result.current.setOverride('', 'overridden empty');
      });

      rerender(null);

      expect(result.current.getFeatureFlag('')).toBe('overridden empty');
      expect(result.current.hasOverride('')).toBe(true);
    });

    describe('Version Support Logic', () => {
      it('returns false for unsupported minimumVersion in development environment', () => {
        const originalNodeEnv = process.env.METAMASK_ENVIRONMENT;
        Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
          value: 'development',
          configurable: true,
        });

        const mockFlags = {
          myFeatureFlag: { enabled: true, minimumVersion: '10.0.0' },
        };
        setupSelectorMocks(mockFlags);
        mockGetFeatureFlagType.mockReturnValue(
          FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
        );
        mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

        const { result } = renderHook(() => useFeatureFlagOverride(), {
          wrapper: createWrapper,
        });

        expect(result.current.getFeatureFlag('myFeatureFlag')).toBe(false);

        Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
          value: originalNodeEnv,
          configurable: true,
        });
      });

      it('returns enabled value when feature flag version is supported', () => {
        const mockFlags = {
          supportedFlag: { enabled: true, minimumVersion: '1.0.0' },
        };
        setupSelectorMocks(mockFlags);
        mockGetFeatureFlagType.mockReturnValue(
          FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
        );
        mockIsMinimumRequiredVersionSupported.mockReturnValue(true);

        const { result } = renderHook(() => useFeatureFlagOverride(), {
          wrapper: createWrapper,
        });

        expect(result.current.getFeatureFlag('supportedFlag')).toBe(true);
      });

      it('returns flag value directly for non-boolean with minimumVersion flag types', () => {
        const mockFlags = {
          stringFlag: 'test value',
        };
        setupSelectorMocks(mockFlags);
        mockGetFeatureFlagType.mockReturnValue(
          FeatureFlagType.FeatureFlagString,
        );
        mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

        const { result } = renderHook(() => useFeatureFlagOverride(), {
          wrapper: createWrapper,
        });

        expect(result.current.getFeatureFlag('stringFlag')).toBe('test value');
      });
    });
  });

  describe('Snapshot Functionality', () => {
    it('takes snapshot when getFeatureFlag is called for boolean flag', async () => {
      const mockFlags = { testBooleanFlag: true };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBoolean,
      );

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('testBooleanFlag');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          testBooleanFlag: true,
        });
      });
    });

    it('takes snapshot when getFeatureFlag is called for boolean with minimumVersion flag', async () => {
      const mockFlags = {
        testVersionFlag: { enabled: true, minimumVersion: '1.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('testVersionFlag');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          testVersionFlag: true,
        });
      });
    });

    it('takes snapshot for each boolean flag when multiple flags are accessed', async () => {
      const mockFlags = {
        flag1: true,
        flag2: false,
        flag3: true,
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBoolean,
      );

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('flag1');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          flag1: true,
        });
      });

      await act(async () => {
        result.current.getFeatureFlag('flag2');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          flag2: false,
        });
      });

      await act(async () => {
        result.current.getFeatureFlag('flag3');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          flag3: true,
        });
      });

      expect(mockAddTraitsToUser).toHaveBeenCalledTimes(3);
    });

    it('does not take snapshot for non-boolean flags', async () => {
      const mockFlags = {
        stringFlag: 'test value',
        numberFlag: 42,
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType
        .mockReturnValueOnce(FeatureFlagType.FeatureFlagString)
        .mockReturnValueOnce(FeatureFlagType.FeatureFlagNumber);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('stringFlag');
        result.current.getFeatureFlag('numberFlag');
      });

      await waitFor(
        () => {
          expect(mockAddTraitsToUser).not.toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it('updates snapshot when same boolean flag is accessed with different value after override', async () => {
      const mockFlags = { testFlag: true };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBoolean,
      );

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('testFlag');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          testFlag: true,
        });
      });

      act(() => {
        result.current.setOverride('testFlag', false);
      });

      rerender(null);

      await act(async () => {
        result.current.getFeatureFlag('testFlag');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenLastCalledWith({
          testFlag: false,
        });
      });
    });

    it('takes snapshot with false value for boolean with minimumVersion when version is not supported', async () => {
      const originalNodeEnv = process.env.METAMASK_ENVIRONMENT;
      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: 'development',
        configurable: true,
      });

      const mockFlags = {
        testVersionFlag: { enabled: true, minimumVersion: '99.0.0' },
      };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(
        FeatureFlagType.FeatureFlagBooleanWithMinimumVersion,
      );
      mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await act(async () => {
        result.current.getFeatureFlag('testVersionFlag');
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          testVersionFlag: false,
        });
      });

      Object.defineProperty(process.env, 'METAMASK_ENVIRONMENT', {
        value: originalNodeEnv,
        configurable: true,
      });
    });

    it('does not call addTraitsToUser when no snapshots are taken', () => {
      const mockFlags = { stringFlag: 'test' };
      setupSelectorMocks(mockFlags);
      mockGetFeatureFlagType.mockReturnValue(FeatureFlagType.FeatureFlagString);

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(mockAddTraitsToUser).not.toHaveBeenCalled();
    });
  });
});
