import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DappsTab from './DappsTab';
import Routes from '../../../../constants/navigation/Routes';
import type { TabProps } from '../hooks/useExploreRefresh';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockUseRecentsFeed = jest.fn();
const mockUseFavoritesFeed = jest.fn();
const mockUseNetworksFeed = jest.fn();
const mockUseSitesFeed = jest.fn();

jest.mock('../feeds/dapps/useRecentsFeed', () => ({
  useRecentsFeed: (...args: unknown[]) => mockUseRecentsFeed(...args),
}));

jest.mock('../feeds/dapps/useFavoritesFeed', () => ({
  useFavoritesFeed: (...args: unknown[]) => mockUseFavoritesFeed(...args),
}));

jest.mock('../feeds/dapps/useNetworksFeed', () => ({
  useNetworksFeed: (...args: unknown[]) => mockUseNetworksFeed(...args),
}));

jest.mock('../components/CardList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/sites/useSitesFeed', () => ({
  useSitesFeed: (...args: unknown[]) => mockUseSitesFeed(...args),
}));

jest.mock('../feeds/dapps/SiteTileRowItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../feeds/sites/SiteRowItem', () => ({
  __esModule: true,
  FavoriteSiteRowItem: () => null,
  SiteRowItem: () => null,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual<typeof import('../../../../util/theme')>(
    '../../../../util/theme',
  );
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
    useAppThemeFromContext: () => actual.mockTheme,
  };
});

const createSite = (overrides: Partial<SiteData> = {}): SiteData => ({
  id: 'site-1',
  name: 'Example',
  url: 'https://example.com',
  displayUrl: 'example.com',
  ...overrides,
});

const defaultTabProps: TabProps = {
  refresh: { trigger: 0, silentRefresh: true },
  refreshing: false,
  onRefresh: jest.fn(),
};

describe('DappsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRecentsFeed.mockReturnValue({ data: [], isLoading: false });
    mockUseFavoritesFeed.mockReturnValue({ data: [], isLoading: false });
    mockUseNetworksFeed.mockReturnValue({
      data: [],
      isLoading: false as const,
      refetch: jest.fn(),
    });
    mockUseSitesFeed.mockReturnValue({ data: [], isLoading: false });
  });

  describe('ecosystems section', () => {
    it('always renders the networks carousel', () => {
      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(getByTestId('explore-dapps_networks-carousel')).toBeOnTheScreen();
      expect(
        getByTestId('section-header-view-all-dapps_networks'),
      ).toBeOnTheScreen();
    });
  });

  describe('recents section', () => {
    it('omits recents when data is empty and not loading', () => {
      const { queryByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(
        queryByTestId('explore-dapps_recents-carousel'),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId('section-header-view-all-dapps_recents'),
      ).not.toBeOnTheScreen();
    });

    it('renders recents section header when loading with empty data', () => {
      mockUseRecentsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-dapps_recents'),
      ).toBeOnTheScreen();
    });

    it('renders recents when data is present', () => {
      mockUseRecentsFeed.mockReturnValue({
        data: [createSite({ url: 'https://a.com' })],
        isLoading: false,
      });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(getByTestId('explore-dapps_recents-carousel')).toBeOnTheScreen();
    });
  });

  describe('favorites section', () => {
    it('omits favorites when data is empty and not loading', () => {
      const { queryByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-dapps_favorites'),
      ).not.toBeOnTheScreen();
    });

    it('renders favorites when loading with empty data', () => {
      mockUseFavoritesFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-dapps_favorites'),
      ).toBeOnTheScreen();
    });

    it('navigates to sites full view with favorites mode when header is pressed', () => {
      mockUseFavoritesFeed.mockReturnValue({
        data: [createSite()],
        isLoading: false,
      });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-dapps_favorites'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SITES_FULL_VIEW, {
        mode: 'favorites',
      });
    });
  });

  describe('sites section', () => {
    it('omits sites when data is empty and not loading', () => {
      const { queryByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-sites'),
      ).not.toBeOnTheScreen();
    });

    it('renders sites when loading with empty data', () => {
      mockUseSitesFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      expect(getByTestId('section-header-view-all-sites')).toBeOnTheScreen();
    });

    it('navigates to sites full view when header is pressed', () => {
      mockUseSitesFeed.mockReturnValue({
        data: [createSite()],
        isLoading: false,
      });

      const { getByTestId } = render(<DappsTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('section-header-view-all-sites'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SITES_FULL_VIEW);
    });
  });

  describe('feed hooks', () => {
    it('passes refresh config to feed hooks that accept it', () => {
      const refresh = { trigger: 2, silentRefresh: false };

      render(<DappsTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUseRecentsFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUseFavoritesFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUseSitesFeed).toHaveBeenCalledWith({ refresh });
      expect(mockUseNetworksFeed).toHaveBeenCalledWith();
    });
  });
});
