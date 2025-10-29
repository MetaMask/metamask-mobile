import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FeatureFlagOverride from './FeatureFlagOverride';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlagStats';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { FeatureFlagInfo } from '../../../util/feature-flags';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../contexts/FeatureFlagOverrideContext', () => ({
  useFeatureFlagOverride: jest.fn(),
}));

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

jest.mock('../../UI/Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => {
    const tw = jest.fn((classNames) => {
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

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Alert: {
      alert: jest.fn(),
    },
  };
});

describe('FeatureFlagOverride', () => {
  let mockNavigation: ReturnType<typeof useNavigation>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type mockValue = any;
  const createMockFeatureFlag = (
    key: string,
    type: FeatureFlagInfo['type'],
    value: mockValue,
    originalValue?: mockValue,
    isOverridden = false,
    description?: string,
  ): FeatureFlagInfo => ({
    key,
    value,
    originalValue: originalValue ?? value,
    type,
    description,
    isOverridden,
  });

  const createMockFeatureFlags = (): FeatureFlagInfo[] => [
    createMockFeatureFlag(
      'booleanFlag',
      'boolean',
      true,
      false,
      true,
      'Boolean flag description',
    ),
    createMockFeatureFlag(
      'stringFlag',
      'string',
      'test value',
      'original',
      true,
      'String flag description',
    ),
    createMockFeatureFlag('numberFlag', 'number', 42),
    createMockFeatureFlag('arrayFlag', 'array', ['item1', 'item2']),
    createMockFeatureFlag('objectFlag', 'object', {
      key: 'value',
      nested: { prop: 'data' },
    }),
    createMockFeatureFlag('versionFlag', 'boolean with minimumVersion', {
      enabled: true,
      minimumVersion: '1.0.0',
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigation = {
      setOptions: jest.fn(),
    };

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    // Set up default mock return values
    (useFeatureFlagOverride as jest.Mock).mockReturnValue({
      setOverride: jest.fn(),
      removeOverride: jest.fn(),
      clearAllOverrides: jest.fn(),
      featureFlagsList: createMockFeatureFlags(),
    });
  });

  describe('Component Rendering', () => {
    it('renders main component with header and stats', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('Feature Flag Statistics')).toBeTruthy();
      expect(screen.getByText('Total: 5')).toBeTruthy();
      expect(screen.getByText('Boolean: 2')).toBeTruthy();
      expect(screen.getByText('Object: 1')).toBeTruthy();
      expect(screen.getByText('String: 2')).toBeTruthy();
    });

    it('renders search input and filter controls', () => {
      render(<FeatureFlagOverride />);

      expect(
        screen.getByPlaceholderText('Search feature flags...'),
      ).toBeTruthy();
      expect(screen.getByText('All (6)')).toBeTruthy();
      expect(screen.getByText('Clear All Overrides')).toBeTruthy();
    });

    it('renders all feature flags by default', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.getByText('stringFlag')).toBeTruthy();
      expect(screen.getByText('numberFlag')).toBeTruthy();
      expect(screen.getByText('arrayFlag')).toBeTruthy();
      expect(screen.getByText('objectFlag')).toBeTruthy();
      expect(screen.getByText('versionFlag')).toBeTruthy();
    });

    it('sets navigation options on mount', () => {
      render(<FeatureFlagOverride />);

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
      render(<FeatureFlagOverride />);

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'boolean');

      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.queryByText('stringFlag')).toBeNull();
      expect(screen.queryByText('numberFlag')).toBeNull();
    });

    it('filters flags by description', () => {
      render(<FeatureFlagOverride />);

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'String flag');

      expect(screen.getByText('stringFlag')).toBeTruthy();
      expect(screen.queryByText('booleanFlag')).toBeNull();
    });

    it('shows no results message when search has no matches', () => {
      render(<FeatureFlagOverride />);

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
      render(<FeatureFlagOverride />);

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'Flag');

      expect(screen.getByText('Showing: 6 flags')).toBeTruthy();
    });

    it('case insensitive search', () => {
      render(<FeatureFlagOverride />);

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'BOOLEAN');

      expect(screen.getByText('booleanFlag')).toBeTruthy();
    });
  });

  describe('Type Filtering', () => {
    it('filters to boolean flags only', () => {
      render(<FeatureFlagOverride />);

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);

      expect(screen.getByText('Boolean (2)')).toBeTruthy();
      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(screen.getByText('versionFlag')).toBeTruthy();
      expect(screen.queryByText('stringFlag')).toBeNull();
      expect(screen.queryByText('objectFlag')).toBeNull();
    });

    it('toggles filter back to all flags', () => {
      render(<FeatureFlagOverride />);

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);
      fireEvent.press(screen.getByText('Boolean (2)'));

      expect(screen.getByText('All (6)')).toBeTruthy();
      expect(screen.getByText('stringFlag')).toBeTruthy();
      expect(screen.getByText('objectFlag')).toBeTruthy();
    });

    it('combines search and type filter', () => {
      render(<FeatureFlagOverride />);

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
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('onlyString', 'string', 'value'),
        ],
      });

      render(<FeatureFlagOverride />);

      const filterButton = screen.getByText('All (1)');
      fireEvent.press(filterButton);

      expect(
        screen.getByText('No boolean feature flags available.'),
      ).toBeTruthy();
    });
  });

  describe('Feature Flag Row Rendering', () => {
    it('displays flag information correctly', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('booleanFlag')).toBeTruthy();
      expect(
        screen.getByText('Type: boolean • Boolean flag description'),
      ).toBeTruthy();
    });

    it('shows overridden indicator and original value', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getAllByText('OVERRIDDEN').length).toBeGreaterThan(0);
      expect(screen.getByText('Original: false')).toBeTruthy();
    });

    it('renders boolean switch for boolean flags', () => {
      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('renders text input for string flags', () => {
      render(<FeatureFlagOverride />);

      const stringInput = screen.getByDisplayValue('test value');
      expect(stringInput).toBeTruthy();
    });

    it('renders text input for number flags', () => {
      render(<FeatureFlagOverride />);

      const numberInput = screen.getByDisplayValue('42');
      expect(numberInput).toBeTruthy();
    });

    it('renders View/Edit button for array flags', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('View/Edit')).toBeTruthy();
    });

    it('renders object properties for object flags', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('key: "value"')).toBeTruthy();
      expect(screen.getByText('nested: {"prop":"data"}')).toBeTruthy();
    });

    it('renders minimum version info for version-gated flags', () => {
      render(<FeatureFlagOverride />);

      expect(screen.getByText('Minimum Version: 1.0.0')).toBeTruthy();
    });

    it('shows reset button for overridden flags', () => {
      render(<FeatureFlagOverride />);

      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBe(2); // For overridden flags
    });
  });

  describe('Flag Editing Interactions', () => {
    it('handles boolean flag toggle', () => {
      const mockSetOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testBool', 'boolean', false)],
      });

      render(<FeatureFlagOverride />);

      const booleanSwitch = screen.getByRole('switch');
      fireEvent(booleanSwitch, 'valueChange', true);

      expect(mockSetOverride).toHaveBeenCalledWith('testBool', true);
    });

    it('handles string input editing', () => {
      const mockSetOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('testString', 'string', 'initial'),
        ],
      });

      render(<FeatureFlagOverride />);

      const stringInput = screen.getByDisplayValue('initial');
      fireEvent.changeText(stringInput, 'updated value');
      fireEvent(stringInput, 'endEditing');

      expect(mockSetOverride).toHaveBeenCalledWith(
        'testString',
        'updated value',
      );
    });

    it('handles number input editing', () => {
      const mockSetOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testNumber', 'number', 5)],
      });

      render(<FeatureFlagOverride />);

      const numberInput = screen.getByDisplayValue('5');
      fireEvent.changeText(numberInput, '10');
      fireEvent(numberInput, 'endEditing');

      expect(mockSetOverride).toHaveBeenCalledWith('testNumber', 10);
    });

    it('handles invalid number input', () => {
      const mockSetOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testNumber', 'number', 5)],
      });

      render(<FeatureFlagOverride />);

      const numberInput = screen.getByDisplayValue('5');
      fireEvent.changeText(numberInput, 'invalid');
      fireEvent(numberInput, 'endEditing');

      expect(mockSetOverride).toHaveBeenCalledWith('testNumber', 0);
    });

    it('handles reset override', () => {
      const mockRemoveOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: mockRemoveOverride,
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('testFlag', 'boolean', true, false, true),
        ],
      });

      render(<FeatureFlagOverride />);

      const resetButton = screen.getByText('Reset');
      fireEvent.press(resetButton);

      expect(mockRemoveOverride).toHaveBeenCalledWith('testFlag');
    });
  });

  describe('Array Flag Interactions', () => {
    it('shows alert when viewing array flag', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('testArray', 'array', ['item1', 'item2']),
        ],
      });

      render(<FeatureFlagOverride />);

      const viewEditButton = screen.getByText('View/Edit');
      fireEvent.press(viewEditButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'testArray (array)',
        JSON.stringify(['item1', 'item2'], null, 2),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Reset to Default' }),
        ]),
      );
    });

    it('handles array flag reset from alert', () => {
      const mockSetOverride = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('testArray', 'array', ['item1', 'item2']),
        ],
      });

      render(<FeatureFlagOverride />);

      const viewEditButton = screen.getByText('View/Edit');
      fireEvent.press(viewEditButton);

      // Simulate pressing "Reset to Default" in alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const resetAction = alertCall[2].find(
        (action: { text: string }) => action.text === 'Reset to Default',
      );
      resetAction.onPress();

      expect(mockSetOverride).toHaveBeenCalledWith('testArray', [
        'item1',
        'item2',
      ]);
    });
  });

  describe('Clear All Overrides', () => {
    it('shows confirmation alert when clearing all overrides', () => {
      render(<FeatureFlagOverride />);

      const clearAllButton = screen.getByText('Clear All Overrides');
      fireEvent.press(clearAllButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear All Overrides',
        'Are you sure you want to clear all feature flag overrides? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Clear All', style: 'destructive' }),
        ]),
      );
    });

    it('clears all overrides when confirmed', () => {
      const mockClearAllOverrides = jest.fn();
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: mockClearAllOverrides,
        featureFlagsList: createMockFeatureFlags(),
      });

      render(<FeatureFlagOverride />);

      const clearAllButton = screen.getByText('Clear All Overrides');
      fireEvent.press(clearAllButton);

      // Simulate pressing "Clear All" in alert
      const alertCall = mockAlert.mock.calls[0];
      const clearAction = alertCall[2].find(
        (action: { text: string }) => action.text === 'Clear All',
      );
      clearAction.onPress();

      expect(mockClearAllOverrides).toHaveBeenCalled();
    });

    it('handles error when clearing all overrides fails', () => {
      const mockClearAllOverrides = jest.fn().mockImplementation(() => {
        throw new Error('Clear failed');
      });
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: mockClearAllOverrides,
        featureFlagsList: createMockFeatureFlags(),
      });

      render(<FeatureFlagOverride />);

      const clearAllButton = screen.getByText('Clear All Overrides');
      fireEvent.press(clearAllButton);

      // Simulate pressing "Clear All" in alert
      const alertCall = mockAlert.mock.calls[0];
      const clearAction = alertCall[2].find(
        (action: { text: string }) => action.text === 'Clear All',
      );
      clearAction.onPress();

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Failed to clear overrides: Clear failed',
      );
    });
  });

  describe('Error Handling', () => {
    it('handles error when setting override fails', () => {
      const mockSetOverride = jest.fn().mockImplementation(() => {
        throw new Error('Set failed');
      });
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testFlag', 'boolean', false)],
      });

      render(<FeatureFlagOverride />);

      const booleanSwitch = screen.getByRole('switch');
      fireEvent(booleanSwitch, 'valueChange', true);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to update feature flag: Set failed',
      );
    });

    it('handles error when removing override fails', () => {
      const mockRemoveOverride = jest.fn().mockImplementation(() => {
        throw new Error('Remove failed');
      });
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: mockRemoveOverride,
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('testFlag', 'boolean', true, false, true),
        ],
      });

      render(<FeatureFlagOverride />);

      const resetButton = screen.getByText('Reset');
      fireEvent.press(resetButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to update feature flag: Remove failed',
      );
    });

    it('handles unknown error types', () => {
      const mockSetOverride = jest.fn().mockImplementation(() => {
        throw 'String error';
      });
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testFlag', 'boolean', false)],
      });

      render(<FeatureFlagOverride />);

      const booleanSwitch = screen.getByRole('switch');
      fireEvent(booleanSwitch, 'valueChange', true);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to update feature flag: Unknown error',
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty feature flags list', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [],
      });

      (useFeatureFlagStats as jest.Mock).mockReturnValue({
        total: 0,
        boolean: 0,
        object: 0,
        string: 0,
        number: 0,
        array: 0,
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('Total: 0')).toBeTruthy();
      expect(screen.getByText('No feature flags available.')).toBeTruthy();
    });

    it('handles flags without descriptions', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('noDesc', 'boolean', true)],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('Type: boolean')).toBeTruthy();
      expect(screen.queryByText('•')).toBeNull();
    });

    it('handles flags with null/undefined values', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('nullFlag', 'string', null)],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('nullFlag')).toBeTruthy();
      expect(screen.getByDisplayValue('null')).toBeTruthy();
    });

    it('handles object flags with empty objects', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('emptyObj', 'object', {})],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('emptyObj')).toBeTruthy();
    });

    it('handles unknown flag types gracefully', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('unknownType', 'boolean', true),
        ],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('unknownType')).toBeTruthy();
      expect(screen.getByText('value')).toBeTruthy();
    });
  });

  describe('Component State Management', () => {
    it('updates local state when editing string inputs', () => {
      render(<FeatureFlagOverride />);

      const stringInput = screen.getByDisplayValue('test value');
      fireEvent.changeText(stringInput, 'new value');

      expect(screen.getByDisplayValue('new value')).toBeTruthy();
    });

    it('updates local state when editing number inputs', () => {
      render(<FeatureFlagOverride />);

      const numberInput = screen.getByDisplayValue('42');
      fireEvent.changeText(numberInput, '99');

      expect(screen.getByDisplayValue('99')).toBeTruthy();
    });

    it('resets local state when resetting override', () => {
      render(<FeatureFlagOverride />);

      const resetButtons = screen.getAllByText('Reset');
      const resetButton = resetButtons[0];
      fireEvent.press(resetButton);

      // Local state should be reset to original value
      const stringInput = screen.getByDisplayValue('original');
      expect(stringInput).toBeTruthy();
    });
  });
});
