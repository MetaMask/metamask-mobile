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
  getFeatureFlagDescription,
  getFeatureFlagType,
  isMinimumRequiredVersionSupported,
} from '../util/feature-flags';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(),
}));

jest.mock('../util/feature-flags', () => ({
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
  let mockGetFeatureFlagDescription: jest.MockedFunction<
    typeof getFeatureFlagDescription
  >;
  let mockGetFeatureFlagType: jest.MockedFunction<typeof getFeatureFlagType>;
  let mockIsMinimumRequiredVersionSupported: jest.MockedFunction<
    typeof isMinimumRequiredVersionSupported
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddTraitsToUser.mockClear();
    mockUseSelector = jest.mocked(useSelector);
    mockGetFeatureFlagDescription = jest.mocked(getFeatureFlagDescription);
    mockGetFeatureFlagType = jest.mocked(getFeatureFlagType);
    mockIsMinimumRequiredVersionSupported = jest.mocked(
      isMinimumRequiredVersionSupported,
    );

    // Default mock implementations
    mockIsMinimumRequiredVersionSupported.mockReturnValue(true);
    mockGetFeatureFlagDescription.mockImplementation(
      (key: string) => `Description for ${key}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetFeatureFlagType.mockImplementation((value: any) => {
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'string') return 'string';
      if (typeof value === 'number') return 'number';
      if (Array.isArray(value)) return 'array';
      if (typeof value === 'object' && value !== null) return 'object';
      return 'string';
    });
  });

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
      mockUseSelector.mockReturnValue(mockFlags);

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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean');

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
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      const keys = result.current.featureFlagsList.map((flag) => flag.key);
      expect(keys).toEqual(['aFlag', 'mFlag', 'zFlag']);
    });

    it('handles empty feature flags from Redux', () => {
      mockUseSelector.mockReturnValue({});

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
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', false);
      });

      expect(result.current.hasOverride('testFlag')).toBe(true);
      expect(result.current.getOverride('testFlag')).toBe(false);
      expect(result.current.getOverrideCount()).toBe(1);
      expect(result.current.getFeatureFlag('testFlag')).toBe(false);
      expect(result.current.featureFlags.testFlag.isOverridden).toBe(true);
    });

    it('sets override for non-existing flag', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('newFlag', 'new value');
      });

      expect(result.current.hasOverride('newFlag')).toBe(true);
      expect(result.current.getOverride('newFlag')).toBe('new value');
      expect(result.current.getFeatureFlag('newFlag')).toBe('new value');
      expect(result.current.featureFlags.newFlag.originalValue).toBeUndefined();
      expect(result.current.featureFlags.newFlag.isOverridden).toBe(true);
    });

    it('removes override and restores original value', () => {
      const mockFlags = { testFlag: true };
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', false);
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe(false);

      act(() => {
        result.current.removeOverride('testFlag');
      });

      expect(result.current.hasOverride('testFlag')).toBe(false);
      expect(result.current.getOverride('testFlag')).toBeUndefined();
      expect(result.current.getFeatureFlag('testFlag')).toBe(true);
      expect(result.current.featureFlags.testFlag.isOverridden).toBe(false);
    });

    it('removes non-existing override without error', () => {
      mockUseSelector.mockReturnValue({});

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
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', false);
        result.current.setOverride('flag2', true);
        result.current.setOverride('flag3', 'new');
      });

      expect(result.current.getOverrideCount()).toBe(3);

      act(() => {
        result.current.clearAllOverrides();
      });

      expect(result.current.getOverrideCount()).toBe(0);
      expect(result.current.hasOverride('flag1')).toBe(false);
      expect(result.current.hasOverride('flag2')).toBe(false);
      expect(result.current.hasOverride('flag3')).toBe(false);
      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.getFeatureFlag('flag2')).toBe(false);
    });

    it('updates multiple overrides independently', () => {
      const mockFlags = { flag1: 'original1', flag2: 'original2' };
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', 'override1');
      });

      expect(result.current.getFeatureFlag('flag1')).toBe('override1');
      expect(result.current.getFeatureFlag('flag2')).toBe('original2');

      act(() => {
        result.current.setOverride('flag2', 'override2');
      });

      expect(result.current.getFeatureFlag('flag1')).toBe('override1');
      expect(result.current.getFeatureFlag('flag2')).toBe('override2');

      act(() => {
        result.current.setOverride('flag1', 'updated1');
      });

      expect(result.current.getFeatureFlag('flag1')).toBe('updated1');
      expect(result.current.getFeatureFlag('flag2')).toBe('override2');
    });
  });

  describe('Context Methods', () => {
    it('getAllOverrides returns copy of overrides object', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', 'value1');
        result.current.setOverride('flag2', 'value2');
      });

      const overrides = result.current.getAllOverrides();
      expect(overrides).toEqual({ flag1: 'value1', flag2: 'value2' });

      // Verify it's a copy, not the same reference
      overrides.flag3 = 'modified';
      expect(result.current.getAllOverrides()).toEqual({
        flag1: 'value1',
        flag2: 'value2',
      });
    });

    it('applyOverrides merges original flags with overrides', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('override1', 'overridden');
        result.current.setOverride('original1', 'modified');
      });

      const originalFlags = {
        original1: 'original',
        original2: 'untouched',
      };

      const applied = result.current.applyOverrides(originalFlags);

      expect(applied).toEqual({
        original1: 'modified', // overridden
        original2: 'untouched', // preserved
        override1: 'overridden', // added
      });
    });

    it('hasOverride returns correct boolean values', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.hasOverride('nonExistent')).toBe(false);

      act(() => {
        result.current.setOverride('existing', 'value');
      });

      expect(result.current.hasOverride('existing')).toBe(true);
      expect(result.current.hasOverride('nonExistent')).toBe(false);
    });

    it('getOverride returns correct values', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getOverride('nonExistent')).toBeUndefined();

      act(() => {
        result.current.setOverride('stringFlag', 'string value');
        result.current.setOverride('numberFlag', 42);
        result.current.setOverride('booleanFlag', false);
        result.current.setOverride('nullFlag', null);
      });

      expect(result.current.getOverride('stringFlag')).toBe('string value');
      expect(result.current.getOverride('numberFlag')).toBe(42);
      expect(result.current.getOverride('booleanFlag')).toBe(false);
      expect(result.current.getOverride('nullFlag')).toBeNull();
    });

    it('getOverrideCount returns correct count', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getOverrideCount()).toBe(0);

      act(() => {
        result.current.setOverride('flag1', 'value1');
      });

      expect(result.current.getOverrideCount()).toBe(1);

      act(() => {
        result.current.setOverride('flag2', 'value2');
        result.current.setOverride('flag3', 'value3');
      });

      expect(result.current.getOverrideCount()).toBe(3);

      act(() => {
        result.current.removeOverride('flag1');
      });

      expect(result.current.getOverrideCount()).toBe(2);

      act(() => {
        result.current.clearAllOverrides();
      });

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
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(mockGetFeatureFlagType).toHaveBeenCalledWith(true);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith('test');
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith(42);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith([1, 2, 3]);
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith({ key: 'value' });

      expect(result.current.featureFlags.booleanFlag.type).toBe('boolean');
      expect(result.current.featureFlags.stringFlag.type).toBe('string');
      expect(result.current.featureFlags.numberFlag.type).toBe('number');
      expect(result.current.featureFlags.arrayFlag.type).toBe('array');
      expect(result.current.featureFlags.objectFlag.type).toBe('object');
    });

    it('calls getFeatureFlagDescription for each flag', () => {
      const mockFlags = { flag1: true, flag2: false };
      mockUseSelector.mockReturnValue(mockFlags);

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(mockGetFeatureFlagDescription).toHaveBeenCalledWith('flag1');
      expect(mockGetFeatureFlagDescription).toHaveBeenCalledWith('flag2');
    });

    it('handles flags with null/undefined values', () => {
      const mockFlags = {
        nullFlag: null,
        undefinedFlag: undefined,
      };
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('nullFlag')).toBeNull();
      expect(result.current.getFeatureFlag('undefinedFlag')).toBeUndefined();
    });

    it('uses original value for type determination when current value is null/undefined', () => {
      const mockFlags = { testFlag: 'original' };
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', null);
      });

      // Should call getFeatureFlagType with original value when current is null
      expect(mockGetFeatureFlagType).toHaveBeenCalledWith('original');
    });
  });

  describe('React State Management', () => {
    it('updates featureFlags when Redux state changes', () => {
      const initialFlags = { flag1: true };
      mockUseSelector.mockReturnValue(initialFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.featureFlagsList).toHaveLength(1);

      // Change Redux state
      const updatedFlags = { flag1: true, flag2: false };
      mockUseSelector.mockReturnValue(updatedFlags);

      rerender(null);

      expect(result.current.getFeatureFlag('flag1')).toBe(true);
      expect(result.current.getFeatureFlag('flag2')).toBe(false);
      expect(result.current.featureFlagsList).toHaveLength(2);
    });

    it('preserves overrides when Redux state changes', () => {
      const initialFlags = { flag1: true };
      mockUseSelector.mockReturnValue(initialFlags);

      const { result, rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('flag1', false);
      });

      expect(result.current.getFeatureFlag('flag1')).toBe(false);

      // Change Redux state
      const updatedFlags = { flag1: true, flag2: 'new' };
      mockUseSelector.mockReturnValue(updatedFlags);

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
      mockUseSelector.mockReturnValue({});

      render(
        <FeatureFlagOverrideProvider>
          <TestComponent />
        </FeatureFlagOverrideProvider>,
      );

      expect(screen.getByText('Override count: 0')).toBeTruthy();
    });

    it('updates component when context changes', () => {
      mockUseSelector.mockReturnValue({ testFlag: true });

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

      expect(screen.getByText('Override count: 1')).toBeTruthy();
    });
  });

  describe('getFeatureFlag Method', () => {
    it('returns undefined for non-existent flags', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('nonExistentFlag')).toBeUndefined();
    });

    it('returns enabled value for boolean with minimumVersion flags when version is supported', () => {
      const mockFlags = {
        testFlag: { enabled: true, minimumVersion: '1.0.0' },
      };
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType
        .mockReturnValueOnce('string')
        .mockReturnValueOnce('number')
        .mockReturnValueOnce('boolean');

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
      mockUseSelector.mockReturnValue(mockFlags);

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('original1', 'modified1'); // Override existing
        result.current.setOverride('new1', 'newValue1'); // Add new
        // original2 remains unchanged
      });

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
      mockUseSelector.mockReturnValue({ testFlag: 'original' });

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setOverride('testFlag', 'change1');
        result.current.setOverride('testFlag', 'change2');
        result.current.setOverride('testFlag', 'change3');
      });

      expect(result.current.getFeatureFlag('testFlag')).toBe('change3');
      expect(result.current.getOverrideCount()).toBe(1);
    });

    it('handles edge case with empty string keys', () => {
      mockUseSelector.mockReturnValue({ '': 'empty key value' });

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      expect(result.current.getFeatureFlag('')).toBe('empty key value');

      act(() => {
        result.current.setOverride('', 'overridden empty');
      });

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
        mockUseSelector.mockReturnValue(mockFlags);
        mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
        mockUseSelector.mockReturnValue(mockFlags);
        mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
        mockUseSelector.mockReturnValue(mockFlags);
        mockGetFeatureFlagType.mockReturnValue('string');
        mockIsMinimumRequiredVersionSupported.mockReturnValue(false);

        const { result } = renderHook(() => useFeatureFlagOverride(), {
          wrapper: createWrapper,
        });

        expect(result.current.getFeatureFlag('stringFlag')).toBe('test value');
      });
    });
  });

  describe('Remote Feature Flag Change Tracking', () => {
    it('adds all feature flags to user traits in bulk when received', async () => {
      const mockFlags = {
        booleanFlag: true,
        stringFlag: 'variant_a',
        numberFlag: 42,
      };
      mockUseSelector.mockReturnValue(mockFlags);

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          booleanFlag: true,
          stringFlag: 'variant_a',
          numberFlag: 42,
        });
      });
    });

    it('adds all feature flags to user traits in bulk when flags change', async () => {
      const initialFlags = { flag1: true, flag2: 'variant_a' };
      mockUseSelector.mockReturnValue(initialFlags);

      const { rerender } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      mockAddTraitsToUser.mockClear();

      const updatedFlags = { flag1: false, flag2: 'variant_b', newFlag: 100 };
      mockUseSelector.mockReturnValue(updatedFlags);

      rerender(null);

      await waitFor(() => {
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          flag1: false,
          flag2: 'variant_b',
          newFlag: 100,
        });
      });
    });

    it('does not call addTraitsToUser when no feature flags exist', async () => {
      mockUseSelector.mockReturnValue({});

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await waitFor(
        () => {
          expect(mockAddTraitsToUser).not.toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it('sends user traits in a single bulk call, not per-flag', async () => {
      const mockFlags = { flag1: true, flag2: 'variant', flag3: 123 };
      mockUseSelector.mockReturnValue(mockFlags);

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        // Should be called exactly once with all flags
        expect(mockAddTraitsToUser).toHaveBeenCalledTimes(1);
        expect(mockAddTraitsToUser).toHaveBeenCalledWith({
          flag1: true,
          flag2: 'variant',
          flag3: 123,
        });
      });
    });
  });

  describe('Snapshot Functionality', () => {
    it('takes snapshot when getFeatureFlag is called for boolean flag', async () => {
      const mockFlags = { testBooleanFlag: true };
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean');

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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean');

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      // Clear the initial bulk call from useEffect
      mockAddTraitsToUser.mockClear();

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

    it('does not take additional snapshot for non-boolean flags via getFeatureFlag', async () => {
      const mockFlags = {
        stringFlag: 'test value',
        numberFlag: 42,
      };
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType
        .mockReturnValueOnce('string')
        .mockReturnValueOnce('number');

      const { result } = renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      // Clear the initial bulk call from useEffect
      mockAddTraitsToUser.mockClear();

      await act(async () => {
        result.current.getFeatureFlag('stringFlag');
        result.current.getFeatureFlag('numberFlag');
      });

      // getFeatureFlag should not add additional traits for non-boolean flags
      await waitFor(
        () => {
          expect(mockAddTraitsToUser).not.toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it('updates snapshot when same boolean flag is accessed with different value after override', async () => {
      const mockFlags = { testFlag: true };
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean');

      const { result } = renderHook(() => useFeatureFlagOverride(), {
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
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('boolean with minimumVersion');
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

    it('calls addTraitsToUser in bulk on mount with all feature flags', () => {
      const mockFlags = { stringFlag: 'test', boolFlag: true };
      mockUseSelector.mockReturnValue(mockFlags);
      mockGetFeatureFlagType.mockReturnValue('string');

      renderHook(() => useFeatureFlagOverride(), {
        wrapper: createWrapper,
      });

      // useEffect sends all flags in bulk on mount
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        stringFlag: 'test',
        boolFlag: true,
      });
    });
  });
});
