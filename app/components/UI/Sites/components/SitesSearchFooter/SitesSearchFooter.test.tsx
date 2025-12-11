import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import SitesSearchFooter from './SitesSearchFooter';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('SitesSearchFooter', () => {
  let mockNavigation: jest.Mocked<NavigationProp<ParamListBase>>;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigation = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<NavigationProp<ParamListBase>>;

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('returns null when searchQuery is empty', () => {
      const { queryByTestId } = render(<SitesSearchFooter searchQuery="" />);

      expect(queryByTestId('trending-search-footer-google-link')).toBeNull();
      expect(queryByTestId('trending-search-footer-url-link')).toBeNull();
    });

    it('renders Google search link when query is provided', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum" />,
      );

      expect(
        getByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
    });

    it('renders URL link when query looks like a URL', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="metamask.io" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
      expect(
        getByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
    });

    it('does not render URL link when query is plain text', () => {
      const { queryByTestId, getByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum blockchain" />,
      );

      expect(queryByTestId('trending-search-footer-url-link')).toBeNull();
      expect(
        getByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
    });
  });

  describe('URL detection', () => {
    it('detects URLs with http protocol', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="http://metamask.io" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('detects URLs with https protocol', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="https://metamask.io" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('detects URLs with path', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="metamask.io/portfolio" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('detects URLs with query parameters', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="metamask.io/portfolio?tab=nfts" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('detects subdomains as URLs', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="portfolio.metamask.io" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('does not detect plain text as URL', () => {
      const { queryByTestId } = render(
        <SitesSearchFooter searchQuery="hello world" />,
      );

      expect(queryByTestId('trending-search-footer-url-link')).toBeNull();
    });

    it('does not detect single word as URL', () => {
      const { queryByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum" />,
      );

      expect(queryByTestId('trending-search-footer-url-link')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates to URL when URL link is pressed', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="metamask.io" />,
      );

      fireEvent.press(getByTestId('trending-search-footer-url-link'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'metamask.io',
        timestamp: 1234567890,
        fromTrending: true,
      });
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('navigates to Google search when Google link is pressed', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum" />,
      );

      fireEvent.press(getByTestId('trending-search-footer-google-link'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://www.google.com/search?q=ethereum',
        timestamp: 1234567890,
        fromTrending: true,
      });
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('encodes special characters in Google search query', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum & bitcoin" />,
      );

      fireEvent.press(getByTestId('trending-search-footer-google-link'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://www.google.com/search?q=ethereum%20%26%20bitcoin',
        timestamp: 1234567890,
        fromTrending: true,
      });
    });
  });

  describe('text display', () => {
    it('displays search query in Google search link', () => {
      const { getByText } = render(
        <SitesSearchFooter searchQuery="ethereum" />,
      );

      expect(getByText('ethereum')).toBeOnTheScreen();
      expect(getByText(/on Google/)).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles URL with uppercase characters', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="MetaMask.IO" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('handles query with leading/trailing spaces', () => {
      const { queryByTestId } = render(
        <SitesSearchFooter searchQuery="  ethereum  " />,
      );

      // Component trims or handles spaces, but doesn't return null
      expect(
        queryByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
    });

    it('handles URL with multiple subdomains', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="api.v2.metamask.io" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeOnTheScreen();
    });

    it('handles URL with port number', () => {
      const { queryByTestId } = render(
        <SitesSearchFooter searchQuery="localhost:3000" />,
      );

      expect(queryByTestId('trending-search-footer-url-link')).toBeNull();
    });

    it('handles special characters in query', () => {
      const { getByTestId } = render(
        <SitesSearchFooter searchQuery="test@#$%query" />,
      );

      expect(
        getByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
    });

    it('handles query with emojis', () => {
      const { getByText, getByTestId } = render(
        <SitesSearchFooter searchQuery="ethereum 🚀" />,
      );

      expect(
        getByTestId('trending-search-footer-google-link'),
      ).toBeOnTheScreen();
      expect(getByText('ethereum 🚀')).toBeOnTheScreen();
    });
  });
});
