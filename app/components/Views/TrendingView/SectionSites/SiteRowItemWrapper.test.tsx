import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SiteRowItemWrapper from './SiteRowItemWrapper';
import type { SiteData } from './SiteRowItem/SiteRowItem';
import { updateLastTrendingScreen } from '../../Nav/Main/MainNavigator';

// Mock dependencies
jest.mock('../../Nav/Main/MainNavigator', () => ({
  updateLastTrendingScreen: jest.fn(),
}));

jest.mock('./SiteRowItem/SiteRowItem', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ site, onPress, isViewAll }) => (
      <ReactNative.TouchableOpacity
        testID="site-row-item-mock"
        onPress={onPress}
      >
        <ReactNative.Text>{site.name}</ReactNative.Text>
        <ReactNative.Text>
          {isViewAll ? 'view-all' : 'main-view'}
        </ReactNative.Text>
      </ReactNative.TouchableOpacity>
    )),
  };
});

describe('SiteRowItemWrapper', () => {
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
  } as unknown as Parameters<typeof SiteRowItemWrapper>[0]['navigation'];

  const createSite = (overrides: Partial<SiteData> = {}): SiteData => ({
    id: 'site-1',
    name: 'MetaMask',
    url: 'https://metamask.io',
    displayUrl: 'metamask.io',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders SiteRowItem with correct props', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      expect(getByText('MetaMask')).toBeOnTheScreen();
    });

    it('passes isViewAll prop to SiteRowItem', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItemWrapper
          site={site}
          navigation={mockNavigation}
          isViewAll
        />,
      );

      expect(getByText('view-all')).toBeOnTheScreen();
    });

    it('defaults isViewAll to false when not provided', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      expect(getByText('main-view')).toBeOnTheScreen();
    });
  });

  describe('navigation behavior', () => {
    it('updates last trending screen when pressed', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
    });

    it('navigates to TrendingBrowser with correct params', () => {
      const site = createSite({ url: 'https://example.com' });
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://example.com',
        timestamp: mockTimestamp,
        fromTrending: true,
      });
    });

    it('uses site URL in navigation params', () => {
      const site = createSite({ url: 'https://custom-site.com/path' });

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: 'https://custom-site.com/path',
        }),
      );
    });

    it('includes fromTrending flag in navigation params', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          fromTrending: true,
        }),
      );
    });

    it('generates unique timestamp for each navigation', () => {
      const site = createSite();
      const mockTimestamp1 = 1000;
      const mockTimestamp2 = 2000;

      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(mockTimestamp1)
        .mockReturnValueOnce(mockTimestamp2);

      const { getByTestId, rerender } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          timestamp: mockTimestamp1,
        }),
      );

      rerender(<SiteRowItemWrapper site={site} navigation={mockNavigation} />);
      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          timestamp: mockTimestamp2,
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles site with special characters in URL', () => {
      const site = createSite({
        url: 'https://example.com/path?param=value&other=test',
      });

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: 'https://example.com/path?param=value&other=test',
        }),
      );
    });

    it('handles site with empty URL', () => {
      const site = createSite({ url: '' });

      const { getByTestId } = render(
        <SiteRowItemWrapper site={site} navigation={mockNavigation} />,
      );

      fireEvent.press(getByTestId('site-row-item-mock'));

      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: '',
        }),
      );
    });
  });
});
