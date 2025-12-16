import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RegionSelectorModal, {
  setOnValueChange,
  clearOnValueChange,
  Region,
} from './RegionSelectorModal';
import { OnboardingState } from '../../../../../core/redux/slices/card';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock useParams
const mockUseParams = jest.fn();
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn(
    (stackId, screenName) => (params?: unknown) => [
      stackId,
      { screen: screenName, params },
    ],
  ),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: { [key: string]: string | number }) => {
      const mockStrings: { [key: string]: string } = {
        'card.card_onboarding.region_selector.title': 'Select Region',
        'card.card_onboarding.errors.no_region_results':
          'No results found for "{searchString}"',
      };

      let result = mockStrings[key] || key;
      if (params) {
        Object.keys(params).forEach((param) => {
          result = result.replace(`{${param}}`, String(params[param]));
        });
      }
      return result;
    },
  ),
}));

// Mock BottomSheet component
const mockOnCloseBottomSheet = jest.fn();
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return React.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
          shouldNavigateBack?: boolean;
          keyboardAvoidingViewEnabled?: boolean;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => {
            mockOnCloseBottomSheet();
            onClose?.();
          },
        }));
        return React.createElement(
          View,
          { testID: testID || 'bottom-sheet' },
          children,
        );
      },
    );
  },
);

// Mock BottomSheetHeader
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const React = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');

    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) =>
      React.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        children,
        onClose &&
          React.createElement(
            TouchableOpacity,
            { testID: 'bottom-sheet-close-button', onPress: onClose },
            'Close',
          ),
      );
  },
);

// Mock ListItemSelect
jest.mock(
  '../../../../../component-library/components/List/ListItemSelect',
  () => {
    const React = jest.requireActual('react');
    const { TouchableOpacity } = jest.requireActual('react-native');

    return ({
      children,
      onPress,
      isSelected,
      testID,
    }: {
      children: React.ReactNode;
      onPress: () => void;
      isSelected?: boolean;
      accessibilityRole?: string;
      accessible?: boolean;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          testID: testID || 'list-item-select',
          onPress,
          accessibilityState: { selected: isSelected },
        },
        children,
      );
  },
);

// Mock ListItemColumn
jest.mock(
  '../../../../../component-library/components/List/ListItemColumn',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    const MockListItemColumn = ({
      children,
    }: {
      children: React.ReactNode;
      widthType?: string;
    }) => React.createElement(View, { testID: 'list-item-column' }, children);

    return {
      __esModule: true,
      default: MockListItemColumn,
      WidthType: {
        Fill: 'Fill',
      },
    };
  },
);

// Mock TextFieldSearch
jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const React = jest.requireActual('react');
    const { TextInput, TouchableOpacity, View } =
      jest.requireActual('react-native');

    return ({
      value,
      onChangeText,
      onPressClearButton,
      onFocus,
      showClearButton,
      testID,
    }: {
      value: string;
      onChangeText: (text: string) => void;
      onPressClearButton?: () => void;
      onFocus?: () => void;
      showClearButton?: boolean;
      testID?: string;
    }) =>
      React.createElement(
        View,
        { testID: 'search-field-container' },
        React.createElement(TextInput, {
          testID: testID || 'search-input',
          value,
          onChangeText,
          onFocus,
        }),
        showClearButton &&
          React.createElement(
            TouchableOpacity,
            {
              testID: 'search-clear-button',
              onPress: onPressClearButton,
            },
            'Clear',
          ),
      );
  },
);

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
      flexDirection?: string;
      alignItems?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        View,
        { testID: testID || 'box', 'data-tw-class': twClassName, ...props },
        children,
      ),
    Text: ({
      children,
      testID,
      variant,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      variant?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        Text,
        { testID: testID || 'text', 'data-variant': variant, ...props },
        children,
      ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyLg: 'BodyLg',
      BodyMd: 'BodyMd',
    },
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
    },
  };
});

// Mock FlatList from react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...jest.requireActual('react-native-gesture-handler'),
    FlatList: RN.FlatList,
  };
});

// Create test store with correct nested structure
const createTestStore = (initialState: { onboarding?: OnboardingState } = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            selectedCountry: null,
            onboardingId: null,
            contactVerificationId: null,
            ...initialState.onboarding,
          },
          ...initialState,
        },
      ) => state,
    },
  });

// Helper to create mock regions
const createMockRegion = (overrides: Partial<Region> = {}): Region => ({
  key: 'US',
  name: 'United States',
  emoji: '🇺🇸',
  areaCode: '1',
  ...overrides,
});

const createMockRegions = (): Region[] => [
  createMockRegion({
    key: 'US',
    name: 'United States',
    emoji: '🇺🇸',
    areaCode: '1',
  }),
  createMockRegion({ key: 'CA', name: 'Canada', emoji: '🇨🇦', areaCode: '1' }),
  createMockRegion({
    key: 'GB',
    name: 'United Kingdom',
    emoji: '🇬🇧',
    areaCode: '44',
  }),
  createMockRegion({ key: 'DE', name: 'Germany', emoji: '🇩🇪', areaCode: '49' }),
  createMockRegion({ key: 'FR', name: 'France', emoji: '🇫🇷', areaCode: '33' }),
];

describe('RegionSelectorModal', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();

    mockUseParams.mockReturnValue({
      regions: createMockRegions(),
      renderAreaCode: false,
    });
  });

  afterEach(() => {
    clearOnValueChange();
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders bottom sheet with header title', () => {
      const { getByText, getByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(getByTestId('region-selector-modal')).toBeTruthy();
      expect(getByText('Select Region')).toBeTruthy();
    });

    it('renders search input field', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(getByTestId('region-selector-search-input')).toBeTruthy();
    });

    it('renders region list with all regions', () => {
      const { getAllByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const regionItems = getAllByTestId('region-selector-item');
      expect(regionItems.length).toBe(5);
    });

    it('displays region emoji and name', () => {
      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(getByText('United States')).toBeTruthy();
      expect(getByText('🇺🇸')).toBeTruthy();
    });

    it('displays area code when renderAreaCode is true', () => {
      mockUseParams.mockReturnValue({
        regions: createMockRegions(),
        renderAreaCode: true,
      });

      const { getAllByText, getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      // US and Canada both have +1 area code, so we expect multiple matches
      expect(getAllByText('(+1)').length).toBeGreaterThan(0);
      expect(getByText('(+44)')).toBeTruthy();
    });

    it('does not display area code when renderAreaCode is false', () => {
      mockUseParams.mockReturnValue({
        regions: createMockRegions(),
        renderAreaCode: false,
      });

      const { queryByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(queryByText('(+1)')).toBeNull();
      expect(queryByText('(+44)')).toBeNull();
    });
  });

  describe('Search Functionality', () => {
    it('filters regions based on search text', async () => {
      const { getByTestId, queryByText, getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'United');
      });

      await waitFor(() => {
        expect(getByText('United States')).toBeTruthy();
        expect(getByText('United Kingdom')).toBeTruthy();
        expect(queryByText('Germany')).toBeNull();
      });
    });

    it('shows empty list message when no results found', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'XYZ');
      });

      await waitFor(() => {
        expect(getByTestId('region-selector-empty-list')).toBeTruthy();
      });
    });

    it('clears search text when clear button is pressed', async () => {
      const { getByTestId, getAllByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'Germany');
      });

      const clearButton = getByTestId('search-clear-button');

      await act(async () => {
        fireEvent.press(clearButton);
      });

      await waitFor(() => {
        const regionItems = getAllByTestId('region-selector-item');
        expect(regionItems.length).toBe(5);
      });
    });

    it('shows clear button only when search text is present', async () => {
      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(queryByTestId('search-clear-button')).toBeNull();

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'Test');
      });

      expect(getByTestId('search-clear-button')).toBeTruthy();
    });
  });

  describe('Region Selection', () => {
    it('calls onValueChange callback when region is pressed', async () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);

      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      await act(async () => {
        fireEvent.press(getByText('Germany'));
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'DE',
          name: 'Germany',
          emoji: '🇩🇪',
        }),
      );
    });

    it('closes bottom sheet when region is selected', async () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);

      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      await act(async () => {
        fireEvent.press(getByText('Canada'));
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });

    it('handles selection when callback is not set', async () => {
      clearOnValueChange();

      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      await act(async () => {
        fireEvent.press(getByText('France'));
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });

  describe('Header Interactions', () => {
    it('closes bottom sheet when header close button is pressed', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const closeButton = getByTestId('bottom-sheet-close-button');

      await act(async () => {
        fireEvent.press(closeButton);
      });

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty regions array', () => {
      mockUseParams.mockReturnValue({
        regions: [],
        renderAreaCode: false,
      });

      const { queryByTestId, getByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(queryByTestId('region-selector-item')).toBeNull();
      expect(getByTestId('region-selector-modal')).toBeTruthy();
    });

    it('handles null regions parameter', () => {
      mockUseParams.mockReturnValue({
        regions: null,
        renderAreaCode: false,
      });

      const { queryByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(queryByTestId('region-selector-item')).toBeNull();
    });

    it('handles undefined regions parameter', () => {
      mockUseParams.mockReturnValue({
        regions: undefined,
        renderAreaCode: false,
      });

      const { queryByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(queryByTestId('region-selector-item')).toBeNull();
    });

    it('handles region with missing emoji', () => {
      mockUseParams.mockReturnValue({
        regions: [
          createMockRegion({
            key: 'XX',
            name: 'Test Country',
            emoji: undefined,
          }),
        ],
        renderAreaCode: false,
      });

      const { getByText, queryByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(getByText('Test Country')).toBeTruthy();
      expect(queryByTestId('region-selector-item')).toBeTruthy();
    });

    it('does not render area code when areaCode is undefined', () => {
      mockUseParams.mockReturnValue({
        regions: [
          createMockRegion({
            key: 'XX',
            name: 'Test Country',
            areaCode: undefined,
          }),
        ],
        renderAreaCode: true,
      });

      const { getByText, queryByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      expect(getByText('Test Country')).toBeTruthy();
      expect(queryByTestId('region-selector-item-area-code')).toBeNull();
    });
  });

  describe('Callback Registry', () => {
    it('setOnValueChange sets callback correctly', () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);

      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      fireEvent.press(getByText('United States'));

      expect(mockCallback).toHaveBeenCalled();
    });

    it('clearOnValueChange removes callback', () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);
      clearOnValueChange();

      const { getByText } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      fireEvent.press(getByText('United States'));

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('sorts regions alphabetically when no search is performed', () => {
      mockUseParams.mockReturnValue({
        regions: [
          createMockRegion({ key: 'ZW', name: 'Zimbabwe' }),
          createMockRegion({ key: 'AL', name: 'Albania' }),
          createMockRegion({ key: 'MX', name: 'Mexico' }),
        ],
        renderAreaCode: false,
      });

      const { getAllByTestId } = render(
        <Provider store={store}>
          <RegionSelectorModal />
        </Provider>,
      );

      const regionItems = getAllByTestId('region-selector-item-name');
      expect(regionItems[0]).toHaveTextContent('Albania');
      expect(regionItems[1]).toHaveTextContent('Mexico');
      expect(regionItems[2]).toHaveTextContent('Zimbabwe');
    });
  });
});
