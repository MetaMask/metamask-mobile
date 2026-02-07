import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
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
  ...jest.requireActual('@react-navigation/native'),
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

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

// Mock Linking to prevent NavigationContainer cleanup errors
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

// Create initial state for tests
const createInitialState = (onboarding: Partial<OnboardingState> = {}) => ({
  card: {
    onboarding: {
      selectedCountry: null,
      onboardingId: null,
      contactVerificationId: null,
      ...onboarding,
    },
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
  let initialState: ReturnType<typeof createInitialState>;

  beforeEach(() => {
    jest.clearAllMocks();
    initialState = createInitialState();

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
      const { getByText, getByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(getByTestId('region-selector-modal')).toBeOnTheScreen();
      expect(getByText('Select Region')).toBeOnTheScreen();
    });

    it('renders search input field', () => {
      const { getByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(getByTestId('region-selector-search-input')).toBeOnTheScreen();
    });

    it('renders region list with all regions', () => {
      const { getAllByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      const regionItems = getAllByTestId('region-selector-item');
      expect(regionItems).toHaveLength(5);
    });

    it('displays region emoji and name', () => {
      const { getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(getByText('United States')).toBeOnTheScreen();
      expect(getByText('🇺🇸')).toBeOnTheScreen();
    });

    it('displays area code when renderAreaCode is true', () => {
      mockUseParams.mockReturnValue({
        regions: createMockRegions(),
        renderAreaCode: true,
      });

      const { getAllByText, getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      expect(getAllByText('(+1)').length).toBeGreaterThan(0);
      expect(getByText('(+44)')).toBeOnTheScreen();
    });

    it('does not display area code when renderAreaCode is false', () => {
      mockUseParams.mockReturnValue({
        regions: createMockRegions(),
        renderAreaCode: false,
      });

      const { queryByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(queryByText('(+1)')).not.toBeOnTheScreen();
      expect(queryByText('(+44)')).not.toBeOnTheScreen();
    });
  });

  describe('Search Functionality', () => {
    it('filters regions based on search text', async () => {
      const { getByTestId, queryByText, getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'United');
      });

      await waitFor(() => {
        expect(getByText('United States')).toBeOnTheScreen();
        expect(getByText('United Kingdom')).toBeOnTheScreen();
        expect(queryByText('Germany')).not.toBeOnTheScreen();
      });
    });

    it('shows empty list message when no results found', async () => {
      const { getByTestId } = renderWithProvider(<RegionSelectorModal />, {
        state: initialState,
      });

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'XYZ');
      });

      await waitFor(() => {
        expect(getByTestId('region-selector-empty-list')).toBeOnTheScreen();
      });
    });

    it('clears search text when clear button is pressed', async () => {
      const { getByTestId, getAllByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'Germany');
      });

      const clearButton = getByTestId('region-selector-clear-button');

      await act(async () => {
        fireEvent.press(clearButton);
      });

      await waitFor(() => {
        const regionItems = getAllByTestId('region-selector-item');
        expect(regionItems).toHaveLength(5);
      });
    });

    it('shows clear button only when search text is present', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      expect(
        queryByTestId('region-selector-clear-button'),
      ).not.toBeOnTheScreen();

      const searchInput = getByTestId('region-selector-search-input');

      await act(async () => {
        fireEvent.changeText(searchInput, 'Test');
      });

      expect(getByTestId('region-selector-clear-button')).toBeOnTheScreen();
    });
  });

  describe('Region Selection', () => {
    it('calls onValueChange callback when region is pressed', async () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);

      const { getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
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

    it('handles selection when callback is not set', async () => {
      clearOnValueChange();

      const { getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      await act(async () => {
        fireEvent.press(getByText('France'));
      });

      // Test passes if no error is thrown when callback is not set
    });
  });

  describe('Edge Cases', () => {
    it('handles empty regions array', () => {
      mockUseParams.mockReturnValue({
        regions: [],
        renderAreaCode: false,
      });

      const { queryByTestId, getByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      expect(queryByTestId('region-selector-item')).not.toBeOnTheScreen();
      expect(getByTestId('region-selector-modal')).toBeOnTheScreen();
    });

    it('handles null regions parameter', () => {
      mockUseParams.mockReturnValue({
        regions: null,
        renderAreaCode: false,
      });

      const { queryByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(queryByTestId('region-selector-item')).not.toBeOnTheScreen();
    });

    it('handles undefined regions parameter', () => {
      mockUseParams.mockReturnValue({
        regions: undefined,
        renderAreaCode: false,
      });

      const { queryByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      expect(queryByTestId('region-selector-item')).not.toBeOnTheScreen();
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

      const { getByText, queryByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      expect(getByText('Test Country')).toBeOnTheScreen();
      expect(queryByTestId('region-selector-item')).toBeOnTheScreen();
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

      const { getByText, queryByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
      );

      expect(getByText('Test Country')).toBeOnTheScreen();
      expect(
        queryByTestId('region-selector-item-area-code'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Callback Registry', () => {
    it('setOnValueChange sets callback correctly', () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);

      const { getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      fireEvent.press(getByText('United States'));

      expect(mockCallback).toHaveBeenCalled();
    });

    it('clearOnValueChange removes callback', () => {
      const mockCallback = jest.fn();
      setOnValueChange(mockCallback);
      clearOnValueChange();

      const { getByText } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
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

      const { getAllByTestId } = renderWithProvider(
        <RegionSelectorModal />,
        { state: initialState },
        false, // Don't include NavigationContainer
      );

      const regionItems = getAllByTestId('region-selector-item-name');
      expect(regionItems[0]).toHaveTextContent('Albania');
      expect(regionItems[1]).toHaveTextContent('Mexico');
      expect(regionItems[2]).toHaveTextContent('Zimbabwe');
    });
  });
});
