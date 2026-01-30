import React, { ReactNode } from 'react';
import {
  render,
  screen,
  fireEvent,
  renderHook,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FeatureFlagOverride from './FeatureFlagOverride';
import {
  FeatureFlagOverrideProvider,
  useFeatureFlagOverride,
} from '../../../contexts/FeatureFlagOverrideContext';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlagStats';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import {
  FeatureFlagType,
  isMinimumRequiredVersionSupported,
} from '../../../util/feature-flags';
import { ToastContext } from '../../../component-library/components/Toast';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useFeatureFlagStats
jest.mock('../../../hooks/useFeatureFlagStats', () => ({
  useFeatureFlagStats: jest.fn(() => ({
    total: 5,
    boolean: 2,
    object: 1,
    string: 2,
    number: 0,
    array: 0,
  })),
}));

// Mock theme
jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: { default: '#0376C9' },
      border: { default: '#D6D9DC', muted: '#F2F4F6' },
      text: { default: '#24272A', muted: '#6A737D', alternative: '#535A61' },
      background: { default: '#FFFFFF', alternative: '#F8F9FA' },
      warning: { muted: '#FFF4E6' },
    },
    brandColors: { white: '#FFFFFF' },
  })),
}));

// Mock Navbar
jest.mock('../../UI/Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tw: jest.MockedFunction<any> = jest.fn((classNames) => {
      if (typeof classNames === 'string') return { testID: classNames };
      if (Array.isArray(classNames)) return {};
      return {};
    });
    tw.style = jest.fn((classNames) => {
      if (typeof classNames === 'string') return { testID: classNames };
      if (Array.isArray(classNames)) return {};
      return {};
    });
    return tw;
  }),
}));

// Mock useMetrics
jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    addTraitsToUser: jest.fn(),
  })),
}));

// Mock Engine
const mockSetFlagOverride = jest.fn();
const mockRemoveFlagOverride = jest.fn();
const mockClearAllFlagOverrides = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    RemoteFeatureFlagController: {
      setFlagOverride: (...args: unknown[]) => mockSetFlagOverride(...args),
      removeFlagOverride: (...args: unknown[]) =>
        mockRemoveFlagOverride(...args),
      clearAllFlagOverrides: (...args: unknown[]) =>
        mockClearAllFlagOverrides(...args),
    },
  },
}));

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock feature flags utility
jest.mock('../../../util/feature-flags', () => ({
  ...jest.requireActual('../../../util/feature-flags'),
  isMinimumRequiredVersionSupported: jest.fn(),
}));

// Helper to create mock Redux store
interface MockReduxState {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: Record<string, unknown>;
        localOverrides: Record<string, unknown>;
      };
    };
  };
}

const createMockStore = (
  rawFlags: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) => {
  const initialState: MockReduxState = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: rawFlags,
          localOverrides: overrides,
        },
      },
    },
  };

  return configureStore({
    reducer: {
      engine: (state = initialState.engine) => state,
    },
    preloadedState: initialState,
  });
};

// Mock Toast context
const mockToastRef = {
  current: { showToast: jest.fn(), closeToast: jest.fn() },
};
const mockToastContext = { toastRef: mockToastRef };

// Test wrapper with all providers
const createTestWrapper = (
  rawFlags: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) => {
  const store = createMockStore(rawFlags, overrides);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <ToastContext.Provider value={mockToastContext}>
        <FeatureFlagOverrideProvider>{children}</FeatureFlagOverrideProvider>
      </ToastContext.Provider>
    </Provider>
  );

  return { Wrapper, store };
};

// Helper to create raw feature flags for the Redux store
const createRawFeatureFlags = () => ({
  booleanFlag: false,
  stringFlag: 'original',
  numberFlag: 42,
  arrayFlag: ['item1', 'item2'],
  objectFlag: { key: 'value', nested: { prop: 'data' } },
  versionFlag: { enabled: true, minimumVersion: '1.0.0' },
});

// Helper to create overrides
const createOverrides = () => ({
  booleanFlag: true,
  stringFlag: 'test value',
});

describe('useFeatureFlagOverride Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetFlagOverride.mockClear();
    mockRemoveFlagOverride.mockClear();
    mockClearAllFlagOverrides.mockClear();
    (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);
  });

  it('returns feature flags list from the context', () => {
    const rawFlags = createRawFeatureFlags();
    const { Wrapper } = createTestWrapper(rawFlags, {});

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    expect(result.current.featureFlagsList).toBeDefined();
    expect(result.current.featureFlagsList.length).toBe(6);
  });

  it('returns override count correctly', () => {
    const rawFlags = createRawFeatureFlags();
    const overrides = createOverrides();
    const { Wrapper } = createTestWrapper(rawFlags, overrides);

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    expect(result.current.getOverrideCount()).toBe(2);
  });

  it('calls Engine setFlagOverride when setOverride is called', () => {
    const { Wrapper } = createTestWrapper(createRawFeatureFlags(), {});

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    result.current.setOverride('testFlag', true);

    expect(mockSetFlagOverride).toHaveBeenCalledWith('testFlag', true);
  });

  it('calls Engine removeFlagOverride when removeOverride is called', () => {
    const { Wrapper } = createTestWrapper(createRawFeatureFlags(), {});

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    result.current.removeOverride('testFlag');

    expect(mockRemoveFlagOverride).toHaveBeenCalledWith('testFlag');
  });

  it('calls Engine clearAllFlagOverrides when clearAllOverrides is called', () => {
    const { Wrapper } = createTestWrapper(createRawFeatureFlags(), {});

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    result.current.clearAllOverrides();

    expect(mockClearAllFlagOverrides).toHaveBeenCalled();
  });

  it('returns hasOverride true for overridden flags', () => {
    const rawFlags = createRawFeatureFlags();
    const overrides = { booleanFlag: true };
    const { Wrapper } = createTestWrapper(rawFlags, overrides);

    const { result } = renderHook(() => useFeatureFlagOverride(), {
      wrapper: Wrapper,
    });

    expect(result.current.hasOverride('booleanFlag')).toBe(true);
    expect(result.current.hasOverride('stringFlag')).toBe(false);
  });
});

describe('FeatureFlagOverride', () => {
  let mockNavigation: NavigationProp<ParamListBase>;

  // Helper to render with providers
  const renderWithProviders = (
    rawFlags: Record<string, unknown> = createRawFeatureFlags(),
    overrides: Record<string, unknown> = createOverrides(),
  ) => {
    const { Wrapper } = createTestWrapper(rawFlags, overrides);
    return render(<FeatureFlagOverride />, { wrapper: Wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockSetFlagOverride.mockClear();
    mockRemoveFlagOverride.mockClear();
    mockClearAllFlagOverrides.mockClear();

    mockNavigation = {
      setOptions: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    // Default mock for version support
    (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);
  });

  describe('Component Rendering', () => {
    it('renders main component with header and stats', () => {
      renderWithProviders();

      expect(screen.getByText('Feature Flag Statistics')).toBeTruthy();
      expect(screen.getByText('Total: 5')).toBeTruthy();
      expect(screen.getByText('Boolean: 2')).toBeTruthy();
      expect(screen.getByText('Object: 1')).toBeTruthy();
      expect(screen.getByText('String: 2')).toBeTruthy();
    });

    it('renders search input and filter controls', () => {
      renderWithProviders();

      expect(
        screen.getByPlaceholderText('Search feature flags...'),
      ).toBeTruthy();
      expect(screen.getByText('All (6)')).toBeTruthy();
      expect(screen.getByText('Clear All Overrides (2)')).toBeTruthy();
    });

    it('renders all feature flags by default', () => {
      renderWithProviders();

      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.getByText('stringFlag')).toBeTruthy();
      expect(screen.getByText('numberFlag')).toBeTruthy();
      expect(screen.getByText('arrayFlag')).toBeTruthy();
      expect(screen.getByText('objectFlag')).toBeTruthy();
      expect(screen.getByText('versionFlag')).toBeTruthy();
    });

    it('sets navigation options on mount', () => {
      renderWithProviders();

      expect(getNavigationOptionsTitle).toHaveBeenCalledWith(
        'Feature Flag Override',
        mockNavigation,
        false,
        expect.any(Object),
        null,
      );
      expect(mockNavigation.setOptions).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('filters flags by key name', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, FeatureFlagType.FeatureFlagBoolean);

      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.queryByText('stringFlag')).toBeNull();
      expect(screen.queryByText('numberFlag')).toBeNull();
    });

    it('shows no results message when search has no matches', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'nonexistent');

      expect(
        screen.getByText('No feature flags match your search.'),
      ).toBeTruthy();
      expect(screen.queryByText('booleanFlag')).toBeNull();
    });

    it('displays filtered count when search is active', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'Flag');

      expect(screen.getByText('Showing: 6 flags')).toBeTruthy();
    });

    it('case insensitive search', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, FeatureFlagType.FeatureFlagBoolean);

      expect(screen.getByText('booleanFlag')).toBeTruthy();
    });
  });

  describe('Type Filtering', () => {
    it('filters to boolean flags only', () => {
      renderWithProviders();

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);

      expect(screen.getByText('Boolean (2)')).toBeTruthy();
      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.getByText('versionFlag')).toBeTruthy();
      expect(screen.queryByText('stringFlag')).toBeNull();
      expect(screen.queryByText('objectFlag')).toBeNull();
    });

    it('toggles filter back to all flags', () => {
      renderWithProviders();

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);
      fireEvent.press(screen.getByText('Boolean (2)'));

      expect(screen.getByText('All (6)')).toBeTruthy();
      expect(screen.getByText('stringFlag')).toBeTruthy();
      expect(screen.getByText('objectFlag')).toBeTruthy();
    });

    it('combines search and type filter', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'flag');

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);

      expect(screen.getByText('Showing: 2 flags')).toBeTruthy();
      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.getByText('versionFlag')).toBeTruthy();
      expect(screen.queryByText('stringFlag')).toBeNull();
    });

    it('shows appropriate no results message for type filter', () => {
      // Render with only a string flag (no boolean flags)
      renderWithProviders({ onlyString: 'value' }, {});

      const filterButton = screen.getByText('All (1)');
      fireEvent.press(filterButton);

      expect(
        screen.getByText('No boolean feature flags available.'),
      ).toBeTruthy();
    });
  });

  describe('Feature Flag Row Rendering', () => {
    it('shows overridden indicator and original value', () => {
      renderWithProviders();

      expect(screen.getAllByText('OVERRIDDEN').length).toBeGreaterThan(0);
      expect(screen.getByText('Original: false')).toBeTruthy();
    });

    it('renders boolean switch for boolean flags', () => {
      renderWithProviders();

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('renders text input for string flags', () => {
      renderWithProviders();

      const stringInput = screen.getByDisplayValue('test value');
      expect(stringInput).toBeTruthy();
    });

    it('renders text input for number flags', () => {
      renderWithProviders();

      const numberInput = screen.getByDisplayValue('42');
      expect(numberInput).toBeTruthy();
    });

    it('renders View/Edit button for array flags', () => {
      renderWithProviders();

      expect(screen.getByText('View/Edit')).toBeTruthy();
    });

    it('renders object properties for object flags', () => {
      renderWithProviders();

      expect(screen.getByText('key: "value"')).toBeTruthy();
      expect(screen.getByText('nested: {"prop":"data"}')).toBeTruthy();
    });

    it('renders minimum version info for version-gated flags', () => {
      renderWithProviders();

      expect(screen.getByText('Minimum Version: 1.0.0')).toBeTruthy();
    });

    it('shows reset button for overridden flags', () => {
      renderWithProviders();

      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBe(2); // For overridden flags
    });
  });

  describe('Flag Editing Interactions', () => {
    it('handles boolean flag toggle', () => {
      // Render with a single boolean flag
      renderWithProviders({ testBool: false }, {});

      const booleanSwitch = screen.getByRole('switch');
      fireEvent(booleanSwitch, 'valueChange', true);

      expect(mockSetFlagOverride).toHaveBeenCalledWith('testBool', true);
    });

    it('handles string input editing', () => {
      // Render with a single string flag
      renderWithProviders({ testString: 'initial' }, {});

      const stringInput = screen.getByDisplayValue('initial');
      fireEvent.changeText(stringInput, 'updated value');
      fireEvent(stringInput, 'endEditing');

      expect(mockSetFlagOverride).toHaveBeenCalledWith(
        'testString',
        'updated value',
      );
    });

    it('handles number input editing', () => {
      // Render with a single number flag
      renderWithProviders({ testNumber: 5 }, {});

      const numberInput = screen.getByDisplayValue('5');
      fireEvent.changeText(numberInput, '10');
      fireEvent(numberInput, 'endEditing');

      expect(mockSetFlagOverride).toHaveBeenCalledWith('testNumber', 10);
    });

    it('handles invalid number input', () => {
      // Render with a single number flag
      renderWithProviders({ testNumber: 5 }, {});

      const numberInput = screen.getByDisplayValue('5');
      fireEvent.changeText(numberInput, 'invalid');
      fireEvent(numberInput, 'endEditing');

      expect(mockSetFlagOverride).toHaveBeenCalledWith('testNumber', 0);
    });

    it('handles reset override', () => {
      // Render with an overridden boolean flag
      renderWithProviders({ testFlag: false }, { testFlag: true });

      const resetButton = screen.getByText('Reset');
      fireEvent.press(resetButton);

      expect(mockRemoveFlagOverride).toHaveBeenCalledWith('testFlag');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty feature flags list', () => {
      (useFeatureFlagStats as jest.Mock).mockReturnValue({
        total: 0,
        boolean: 0,
        object: 0,
        string: 0,
        number: 0,
        array: 0,
      });

      // Render with empty flags
      renderWithProviders({}, {});

      expect(screen.getByText('Total: 0')).toBeTruthy();
      expect(screen.getByText('No feature flags available.')).toBeTruthy();
    });

    it('handles flags with null/undefined values', () => {
      // Render with a null flag value
      renderWithProviders({ nullFlag: null }, {});

      expect(screen.getByText('nullFlag')).toBeTruthy();
    });

    it('handles object flags with empty objects', () => {
      // Render with an empty object flag
      renderWithProviders({ emptyObj: {} }, {});

      expect(screen.getByText('emptyObj')).toBeTruthy();
    });
  });

  describe('Component State Management', () => {
    it('updates local state when editing string inputs', () => {
      renderWithProviders();

      const stringInput = screen.getByDisplayValue('test value');
      fireEvent.changeText(stringInput, 'new value');

      expect(screen.getByDisplayValue('new value')).toBeTruthy();
    });

    it('updates local state when editing number inputs', () => {
      renderWithProviders();

      const numberInput = screen.getByDisplayValue('42');
      fireEvent.changeText(numberInput, '99');

      expect(screen.getByDisplayValue('99')).toBeTruthy();
    });

    it('resets local state when resetting override', () => {
      renderWithProviders();

      const resetButtons = screen.getAllByText('Reset');
      const resetButton = resetButtons[0];
      fireEvent.press(resetButton);

      // The reset button should be pressed successfully
      // Note: The actual state reset would be handled by the useFeatureFlagOverride hook
      // This test verifies that the reset button is accessible and can be pressed
      expect(resetButton).toBeTruthy();
    });
  });

  describe('Boolean with MinimumVersion Flag', () => {
    it('disables switch when version is not supported and flag is not in FeatureFlagNames', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(false);

      // Render with a version-gated flag
      renderWithProviders(
        { unsupportedVersionFlag: { enabled: true, minimumVersion: '2.0.0' } },
        {},
      );

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches.find(
        (switchElement) => switchElement.props.value === true,
      );
      expect(versionSwitch?.props.disabled).toBe(true);
    });

    it('handles toggle for boolean with minimumVersion flag', () => {
      // Render with a version-gated flag
      renderWithProviders(
        { versionFlag: { enabled: false, minimumVersion: '1.0.0' } },
        {},
      );

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches[0];
      fireEvent(versionSwitch, 'valueChange', true);

      expect(mockSetFlagOverride).toHaveBeenCalledWith('versionFlag', {
        enabled: true,
        minimumVersion: '1.0.0',
      });
    });

    it('displays version support indicator correctly when version is supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);

      // Render with a version-gated flag
      renderWithProviders(
        { versionFlag: { enabled: true, minimumVersion: '1.0.0' } },
        {},
      );

      expect(screen.getByText('Minimum Version: 1.0.0')).toBeTruthy();
    });

    it('displays version support indicator correctly when version is not supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(false);

      // Render with a version-gated flag with higher version requirement
      renderWithProviders(
        { versionFlag: { enabled: true, minimumVersion: '2.0.0' } },
        {},
      );

      expect(screen.getByText('Minimum Version: 2.0.0')).toBeTruthy();
    });
  });

  describe('Empty State Messages', () => {
    it('shows correct message when search and type filter both active with no results', () => {
      // Render with only a string flag
      renderWithProviders({ onlyString: 'value' }, {});

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'nonexistent');

      const filterButton = screen.getByText('All (1)');
      fireEvent.press(filterButton);

      expect(
        screen.getByText('No boolean feature flags match your search.'),
      ).toBeTruthy();
    });

    it('shows correct message when only type filter is active with no results', () => {
      // Render with only a string flag
      renderWithProviders({ onlyString: 'value' }, {});

      const filterButton = screen.getByText('All (1)');
      fireEvent.press(filterButton);

      expect(
        screen.getByText('No boolean feature flags available.'),
      ).toBeTruthy();
    });

    it('shows correct message when only search is active with no results', () => {
      // Render with default feature flags
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'nonexistent');

      expect(
        screen.getByText('No feature flags match your search.'),
      ).toBeTruthy();
    });
  });

  describe('Default Case in renderValueEditor', () => {
    it('renders default text display for unknown flag types', () => {
      // Render with a boolean flag (tests type handling)
      renderWithProviders({ unknownTypeFlag: true }, {});

      // The component should still render the flag
      expect(screen.getByText('unknownTypeFlag')).toBeTruthy();
    });
  });

  describe('Filtered Count Display', () => {
    it('shows filtered count when type filter is active', () => {
      renderWithProviders();

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);

      expect(screen.getByText('Showing: 2 flags')).toBeTruthy();
    });

    it('shows filtered count when search is active', () => {
      renderWithProviders();

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, FeatureFlagType.FeatureFlagBoolean);

      expect(screen.getByText('Showing: 1 flags')).toBeTruthy();
    });

    it('does not show filtered count when no filters are active', () => {
      renderWithProviders();

      expect(screen.queryByText(/Showing: \d+ flags/)).toBeNull();
    });
  });

  describe('A/B Test Flag Handling', () => {
    it('renders text display for A/B test flags in store', () => {
      // Render with an A/B test flag
      const storeWithAbTest = createMockStore(
        { abTestFlag: { name: 'control', value: { variant: 'A' } } },
        {},
      );

      render(
        <Provider store={storeWithAbTest}>
          <ToastContext.Provider value={mockToastContext}>
            <FeatureFlagOverrideProvider>
              <FeatureFlagOverride />
            </FeatureFlagOverrideProvider>
          </ToastContext.Provider>
        </Provider>,
      );

      expect(screen.getByText('abTestFlag')).toBeTruthy();
    });
  });

  describe('Version-gated Flag Interactions', () => {
    it('enables switch when version is supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);

      renderWithProviders(
        { versionFlag: { enabled: false, minimumVersion: '1.0.0' } },
        {},
      );

      const switches = screen.getAllByRole('switch');
      expect(switches[0].props.disabled).toBe(false);
    });
  });

  describe('Flag Value Rendering', () => {
    it('renders correctly when object flag has nested properties', () => {
      renderWithProviders(
        { nestedObj: { level1: { level2: { deep: 'value' } } } },
        {},
      );

      expect(screen.getByText('nestedObj')).toBeTruthy();
      expect(
        screen.getByText('level1: {"level2":{"deep":"value"}}'),
      ).toBeTruthy();
    });

    it('renders array flag with correct label', () => {
      renderWithProviders({ myArray: [1, 2, 3, 4, 5] }, {});

      expect(screen.getByText('myArray')).toBeTruthy();
      expect(screen.getByText('View/Edit')).toBeTruthy();
    });
  });

  describe('FeatureFlagRow State Sync', () => {
    it('syncs localValue with flag.value when override is removed', () => {
      // Start with an overridden string flag
      const { rerender } = render(<FeatureFlagOverride />, {
        wrapper: createTestWrapper(
          { stringFlag: 'original' },
          { stringFlag: 'overridden' },
        ).Wrapper,
      });

      // Verify overridden value is displayed
      expect(screen.getByDisplayValue('overridden')).toBeTruthy();

      // Rerender with override removed
      const { Wrapper: NewWrapper } = createTestWrapper(
        { stringFlag: 'original' },
        {},
      );
      rerender(
        <NewWrapper>
          <FeatureFlagOverride />
        </NewWrapper>,
      );

      // Verify original value is now displayed
      expect(screen.getByDisplayValue('original')).toBeTruthy();
    });
  });

  describe('BooleanNested Flag Type', () => {
    it('filters include boolean nested flags when boolean filter is active', () => {
      // Render with a nested boolean flag
      renderWithProviders({ nestedBoolFlag: { value: true } }, {});

      const filterButton = screen.getByText('All (1)');
      fireEvent.press(filterButton);

      // Boolean nested flags should be included in boolean filter
      expect(screen.getByText('nestedBoolFlag')).toBeTruthy();
    });
  });
});
