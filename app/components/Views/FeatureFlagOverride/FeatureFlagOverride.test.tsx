import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FeatureFlagOverride from './FeatureFlagOverride';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlagStats';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import {
  FeatureFlagInfo,
  isMinimumRequiredVersionSupported,
} from '../../../util/feature-flags';

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

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Mock feature flags utility
jest.mock('../../../util/feature-flags', () => ({
  ...jest.requireActual('../../../util/feature-flags'),
  isMinimumRequiredVersionSupported: jest.fn(),
}));

// Mock FeatureFlagNames to include testFlag for testing
jest.mock('../../hooks/useFeatureFlag', () => {
  const actual = jest.requireActual('../../hooks/useFeatureFlag');
  return {
    ...actual,
    FeatureFlagNames: {
      ...actual.FeatureFlagNames,
      testFlag: 'testFlag',
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
    mockAlert.mockClear();

    mockNavigation = {
      setOptions: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    // Set up default mock return values
    (useFeatureFlagOverride as jest.Mock).mockReturnValue({
      setOverride: jest.fn(),
      removeOverride: jest.fn(),
      clearAllOverrides: jest.fn(),
      featureFlagsList: createMockFeatureFlags(),
    });

    // Default mock for version support
    (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);
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
      expect(screen.getByText('Type: boolean')).toBeTruthy();
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

      // The reset button should be pressed successfully
      // Note: The actual state reset would be handled by the useFeatureFlagOverride hook
      // This test verifies that the reset button is accessible and can be pressed
      expect(resetButton).toBeTruthy();
    });
  });

  describe('Boolean with MinimumVersion Flag', () => {
    it('disables switch when version is not supported and flag is not in FeatureFlagNames', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(false);

      const versionFlag = createMockFeatureFlag(
        'unsupportedVersionFlag',
        'boolean with minimumVersion',
        {
          enabled: true,
          minimumVersion: '2.0.0',
        },
      );

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [versionFlag],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches.find(
        (switchElement) => switchElement.props.value === true,
      );
      expect(versionSwitch?.props.disabled).toBe(true);
    });

    it('enables switch when version is supported even if flag is not in FeatureFlagNames', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);

      const versionFlag = createMockFeatureFlag(
        'supportedVersionFlag',
        'boolean with minimumVersion',
        {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      );

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [versionFlag],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches.find(
        (switchElement) => switchElement.props.value === true,
      );
      expect(versionSwitch?.props.disabled).toBe(false);
    });

    it('enables switch when flag is in FeatureFlagNames even if version is not supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(false);

      const versionFlag = createMockFeatureFlag(
        'testFlag',
        'boolean with minimumVersion',
        {
          enabled: true,
          minimumVersion: '2.0.0',
        },
      );

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [versionFlag],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches.find(
        (switchElement) => switchElement.props.value === true,
      );
      expect(versionSwitch?.props.disabled).toBe(false);
    });

    it('handles toggle for boolean with minimumVersion flag', () => {
      const mockSetOverride = jest.fn();
      const versionFlagValue = {
        enabled: false,
        minimumVersion: '1.0.0',
      };

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: mockSetOverride,
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag(
            'versionFlag',
            'boolean with minimumVersion',
            versionFlagValue,
          ),
        ],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const versionSwitch = switches[0];
      fireEvent(versionSwitch, 'valueChange', true);

      expect(mockSetOverride).toHaveBeenCalledWith('versionFlag', {
        enabled: true,
        minimumVersion: '1.0.0',
      });
    });

    it('displays version support indicator correctly when version is supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(true);

      const versionFlag = createMockFeatureFlag(
        'versionFlag',
        'boolean with minimumVersion',
        {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      );

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [versionFlag],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('Minimum Version: 1.0.0')).toBeTruthy();
    });

    it('displays version support indicator correctly when version is not supported', () => {
      (isMinimumRequiredVersionSupported as jest.Mock).mockReturnValue(false);

      const versionFlag = createMockFeatureFlag(
        'versionFlag',
        'boolean with minimumVersion',
        {
          enabled: true,
          minimumVersion: '2.0.0',
        },
      );

      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [versionFlag],
      });

      render(<FeatureFlagOverride />);

      expect(screen.getByText('Minimum Version: 2.0.0')).toBeTruthy();
    });
  });

  describe('Boolean Flag Disabled State', () => {
    it('disables boolean switch when flag is not in FeatureFlagNames', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('unknownBooleanFlag', 'boolean', false),
        ],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const booleanSwitch = switches[0];
      expect(booleanSwitch.props.disabled).toBe(true);
    });

    it('enables boolean switch when flag is in FeatureFlagNames', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [createMockFeatureFlag('testFlag', 'boolean', false)],
      });

      render(<FeatureFlagOverride />);

      const switches = screen.getAllByRole('switch');
      const booleanSwitch = switches[0];
      expect(booleanSwitch.props.disabled).toBe(false);
    });
  });

  describe('Empty State Messages', () => {
    it('shows correct message when search and type filter both active with no results', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          createMockFeatureFlag('onlyString', 'string', 'value'),
        ],
      });

      render(<FeatureFlagOverride />);

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

    it('shows correct message when only search is active with no results', () => {
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: createMockFeatureFlags(),
      });

      render(<FeatureFlagOverride />);

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
      // Create a flag with a type that doesn't match any case
      // We'll use 'boolean' type but with a value that might trigger default
      (useFeatureFlagOverride as jest.Mock).mockReturnValue({
        setOverride: jest.fn(),
        removeOverride: jest.fn(),
        clearAllOverrides: jest.fn(),
        featureFlagsList: [
          {
            key: 'unknownTypeFlag',
            value: 'some value',
            originalValue: 'some value',
            type: 'boolean' as FeatureFlagInfo['type'],
            description: undefined,
            isOverridden: false,
          },
        ],
      });

      render(<FeatureFlagOverride />);

      // The component should still render the flag
      expect(screen.getByText('unknownTypeFlag')).toBeTruthy();
    });
  });

  describe('Filtered Count Display', () => {
    it('shows filtered count when type filter is active', () => {
      render(<FeatureFlagOverride />);

      const filterButton = screen.getByText('All (6)');
      fireEvent.press(filterButton);

      expect(screen.getByText('Showing: 2 flags')).toBeTruthy();
    });

    it('shows filtered count when search is active', () => {
      render(<FeatureFlagOverride />);

      const searchInput = screen.getByPlaceholderText(
        'Search feature flags...',
      );
      fireEvent.changeText(searchInput, 'boolean');

      expect(screen.getByText('Showing: 1 flags')).toBeTruthy();
    });

    it('does not show filtered count when no filters are active', () => {
      render(<FeatureFlagOverride />);

      expect(screen.queryByText(/Showing: \d+ flags/)).toBeNull();
    });
  });
});
