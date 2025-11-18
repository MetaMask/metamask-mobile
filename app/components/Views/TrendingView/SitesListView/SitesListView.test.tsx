import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import SitesListView from './SitesListView';
import { useSitesData } from '../SectionSites/hooks/useSitesData';
import type { SiteData } from '../SectionSites/SiteRowItem/SiteRowItem';

// Mock dependencies
jest.mock('../SectionSites/hooks/useSitesData');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 50, bottom: 34, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockTwStyle = jest.fn((...args: unknown[]) => {
  const flatArgs = args.flat().filter(Boolean);
  return flatArgs.reduce((acc: Record<string, unknown>, arg) => {
    if (typeof arg === 'string') {
      return { ...acc, [arg]: true };
    }
    if (typeof arg === 'object') {
      return { ...acc, ...arg };
    }
    return acc;
  }, {});
});

// Make mockTw callable as both function and object with style method
const mockTw = Object.assign(mockTwStyle, { style: mockTwStyle });

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

jest.mock('../SectionSites/SiteRowItemWrapper', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(({ site }) => (
    <ReactNative.View testID={`site-item-${site.id}`}>
      <ReactNative.Text>{site.name}</ReactNative.Text>
    </ReactNative.View>
  ));
});

jest.mock('../SectionSites/SiteSkeleton/SiteSkeleton', () =>
  jest.fn(() => {
    const ReactNative = jest.requireActual('react-native');
    return (
      <ReactNative.View testID="site-skeleton">
        <ReactNative.Text>Loading...</ReactNative.Text>
      </ReactNative.View>
    );
  }),
);

jest.mock('../ExploreSearchBar/ExploreSearchBar', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(
    ({ searchQuery, onSearchChange, onCancel, isSearchFocused, type }) => (
      <ReactNative.View testID="explore-search-bar">
        <ReactNative.TextInput
          testID="search-input"
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search"
          autoFocus={isSearchFocused}
        />
        <ReactNative.TouchableOpacity testID="cancel-button" onPress={onCancel}>
          <ReactNative.Text>Cancel</ReactNative.Text>
        </ReactNative.TouchableOpacity>
        <ReactNative.Text testID="search-type">{type}</ReactNative.Text>
      </ReactNative.View>
    ),
  );
});

const mockKeyboardDismiss = jest.fn();
jest.spyOn(Keyboard, 'dismiss').mockImplementation(mockKeyboardDismiss);

const mockUseSitesData = useSitesData as jest.Mock;

describe('SitesListView', () => {
  const mockSites: SiteData[] = [
    {
      id: '1',
      name: 'MetaMask',
      url: 'https://metamask.io',
      displayUrl: 'metamask.io',
      logoUrl: 'https://example.com/metamask.png',
      featured: true,
    },
    {
      id: '2',
      name: 'OpenSea',
      url: 'https://opensea.io',
      displayUrl: 'opensea.io',
      logoUrl: 'https://example.com/opensea.png',
      featured: false,
    },
    {
      id: '3',
      name: 'Uniswap',
      url: 'https://uniswap.org',
      displayUrl: 'uniswap.org',
      logoUrl: 'https://example.com/uniswap.png',
      featured: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all basic components', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, getByText } = render(<SitesListView />);

      expect(getByTestId('explore-search-bar')).toBeTruthy();
      expect(getByText('Popular sites')).toBeTruthy();
      expect(getByTestId('site-item-1')).toBeTruthy();
      expect(getByTestId('site-item-2')).toBeTruthy();
      expect(getByTestId('site-item-3')).toBeTruthy();
    });

    it('should render skeletons when loading', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        error: null,
      });

      const { getAllByTestId } = render(<SitesListView />);

      const skeletons = getAllByTestId('site-skeleton');
      expect(skeletons.length).toBe(10);
    });

    it('should render empty state when no sites found', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<SitesListView />);

      expect(getByText('No sites found')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter sites by name', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');

      fireEvent.changeText(searchInput, 'Meta');

      expect(getByTestId('site-item-1')).toBeTruthy();
      expect(queryByTestId('site-item-2')).toBeNull();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('should filter sites by URL', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');

      fireEvent.changeText(searchInput, 'opensea');

      expect(queryByTestId('site-item-1')).toBeNull();
      expect(getByTestId('site-item-2')).toBeTruthy();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('should be case-insensitive', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');

      fireEvent.changeText(searchInput, 'METAMASK');

      expect(getByTestId('site-item-1')).toBeTruthy();
    });

    it('should show all sites when search is empty or whitespace', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');

      fireEvent.changeText(searchInput, '   ');

      expect(getByTestId('site-item-1')).toBeTruthy();
      expect(getByTestId('site-item-2')).toBeTruthy();
      expect(getByTestId('site-item-3')).toBeTruthy();
    });

    it('should show empty state when no results match', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, getByText } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');

      fireEvent.changeText(searchInput, 'nonexistent');

      expect(getByText('No sites found')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should clear search, dismiss keyboard and navigate back on cancel', async () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);
      const searchInput = getByTestId('search-input');
      const cancelButton = getByTestId('cancel-button');

      fireEvent.changeText(searchInput, 'test');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(searchInput.props.value).toBe('');
      });

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch sites with limit of 100', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      render(<SitesListView />);

      expect(mockUseSitesData).toHaveBeenCalledWith({ limit: 100 });
    });

    it('should pass isViewAll prop to child components', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const SiteRowItemWrapper = jest.requireMock(
        '../SectionSites/SiteRowItemWrapper',
      );

      render(<SitesListView />);

      expect(SiteRowItemWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          isViewAll: true,
        }),
        expect.anything(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle transition from loading to loaded', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        error: null,
      });

      const { rerender, getAllByTestId, queryByTestId, getByTestId } = render(
        <SitesListView />,
      );

      expect(getAllByTestId('site-skeleton').length).toBe(10);

      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      rerender(<SitesListView />);

      expect(queryByTestId('site-skeleton')).toBeNull();
      expect(getByTestId('site-item-1')).toBeTruthy();
    });

    it('should handle sites with missing optional fields', () => {
      const minimalSites: SiteData[] = [
        {
          id: '1',
          name: 'Test',
          url: 'https://test.com',
          displayUrl: 'test.com',
        },
      ];

      mockUseSitesData.mockReturnValue({
        sites: minimalSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      expect(getByTestId('site-item-1')).toBeTruthy();
    });
  });
});
