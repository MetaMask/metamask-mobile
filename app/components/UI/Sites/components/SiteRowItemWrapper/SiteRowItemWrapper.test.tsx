import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SiteRowItemWrapper from './SiteRowItemWrapper';
import { updateLastTrendingScreen } from '../../../../Nav/Main/MainNavigator';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { SiteData } from '../SiteRowItem/SiteRowItem';

// Mock the dependencies
jest.mock('../../../../Nav/Main/MainNavigator', () => ({
  updateLastTrendingScreen: jest.fn(),
}));

jest.mock('../SiteRowItem/SiteRowItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: jest.fn(({ onPress, site }) => (
      <TouchableOpacity testID="site-row-item" onPress={onPress}>
        <Text testID="site-id">{site.id}</Text>
        <Text testID="site-name">{site.name}</Text>
        <Text testID="site-url">{site.url}</Text>
        <Text testID="site-display-url">{site.displayUrl}</Text>
        {site.logoUrl && <Text testID="site-logo-url">{site.logoUrl}</Text>}
        {site.featured && <Text testID="site-featured">Featured</Text>}
      </TouchableOpacity>
    )),
  };
});

describe('SiteRowItemWrapper', () => {
  let mockNavigation: jest.Mocked<NavigationProp<ParamListBase>>;
  let mockSiteData: SiteData;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigation = {
      navigate: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(),
      canGoBack: jest.fn(),
      getState: jest.fn(),
      getParent: jest.fn(),
      setParams: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dangerouslyGetParent: jest.fn(),
      dangerouslyGetState: jest.fn(),
    } as jest.Mocked<NavigationProp<ParamListBase>>;

    mockSiteData = {
      id: '1',
      name: 'Example Site',
      url: 'https://example.com',
      displayUrl: 'example.com',
      logoUrl: 'https://example.com/logo.png',
      featured: false,
    };

    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('should render SiteRowItem with correct props', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      expect(getByTestId('site-row-item')).toBeTruthy();
      expect(getByTestId('site-id').props.children).toBe('1');
      expect(getByTestId('site-name').props.children).toBe('Example Site');
      expect(getByTestId('site-url').props.children).toBe(
        'https://example.com',
      );
      expect(getByTestId('site-display-url').props.children).toBe(
        'example.com',
      );
    });

    it('should render site with logoUrl', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      expect(getByTestId('site-logo-url').props.children).toBe(
        'https://example.com/logo.png',
      );
    });

    it('should render site without logoUrl', () => {
      const siteWithoutLogo: SiteData = {
        id: '2',
        name: 'Site Without Logo',
        url: 'https://no-logo.com',
        displayUrl: 'no-logo.com',
      };

      const { queryByTestId } = render(
        <SiteRowItemWrapper
          site={siteWithoutLogo}
          navigation={mockNavigation}
        />,
      );

      expect(queryByTestId('site-logo-url')).toBeNull();
    });

    it('should render featured site', () => {
      const featuredSite: SiteData = {
        id: '3',
        name: 'Featured Site',
        url: 'https://featured.com',
        displayUrl: 'featured.com',
        featured: true,
      };

      const { getByTestId } = render(
        <SiteRowItemWrapper site={featuredSite} navigation={mockNavigation} />,
      );

      expect(getByTestId('site-featured').props.children).toBe('Featured');
    });

    it('should not render featured tag for non-featured site', () => {
      const { queryByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      expect(queryByTestId('site-featured')).toBeNull();
    });

    it('should render with different site data', () => {
      const differentSiteData: SiteData = {
        id: '4',
        name: 'Another Site',
        url: 'https://another-site.com',
        displayUrl: 'another-site.com',
        logoUrl: 'https://another-site.com/logo.png',
        featured: true,
      };

      const { getByTestId } = render(
        <SiteRowItemWrapper
          site={differentSiteData}
          navigation={mockNavigation}
        />,
      );

      expect(getByTestId('site-id').props.children).toBe('4');
      expect(getByTestId('site-name').props.children).toBe('Another Site');
      expect(getByTestId('site-url').props.children).toBe(
        'https://another-site.com',
      );
      expect(getByTestId('site-display-url').props.children).toBe(
        'another-site.com',
      );
      expect(getByTestId('site-featured')).toBeTruthy();
    });
  });

  describe('Navigation and Press Handling', () => {
    it('should call updateLastTrendingScreen when pressed', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
      expect(updateLastTrendingScreen).toHaveBeenCalledTimes(1);
    });

    it('should navigate to TrendingBrowser with correct params when pressed', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://example.com',
        timestamp: 1234567890,
        fromTrending: true,
      });
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate with correct URL for different sites', () => {
      const customSite: SiteData = {
        id: '5',
        name: 'Custom Site',
        url: 'https://custom-url.com/page',
        displayUrl: 'custom-url.com',
      };

      const { getByTestId } = render(
        <SiteRowItemWrapper site={customSite} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://custom-url.com/page',
        timestamp: 1234567890,
        fromTrending: true,
      });
    });

    it('should update screen before navigating', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      const callOrder: string[] = [];

      (updateLastTrendingScreen as jest.Mock).mockImplementation(() => {
        callOrder.push('update');
      });

      (mockNavigation.navigate as jest.Mock).mockImplementation(() => {
        callOrder.push('navigate');
      });

      fireEvent.press(getByTestId('site-row-item'));

      expect(callOrder).toEqual(['update', 'navigate']);
    });

    it('should handle multiple presses correctly', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      const siteRowItem = getByTestId('site-row-item');

      fireEvent.press(siteRowItem);
      fireEvent.press(siteRowItem);
      fireEvent.press(siteRowItem);

      expect(updateLastTrendingScreen).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
    });

    it('should always pass fromTrending as true', () => {
      const { getByTestId } = render(
        <SiteRowItemWrapper site={mockSiteData} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({ fromTrending: true }),
      );
    });
  });

  describe('Props variations', () => {
    it('should work with minimal site data', () => {
      const minimalSiteData: SiteData = {
        id: '6',
        name: 'Minimal',
        url: 'https://minimal.com',
        displayUrl: 'minimal.com',
      };

      const { getByTestId } = render(
        <SiteRowItemWrapper
          site={minimalSiteData}
          navigation={mockNavigation}
        />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://minimal.com',
        timestamp: 1234567890,
        fromTrending: true,
      });
    });
  });
});
