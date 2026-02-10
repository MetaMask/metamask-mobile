import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import UrlAutocompleteSearchFooter from './UrlAutocompleteSearchFooter';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
    },
  }),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      searchFooterContainer: {},
      searchFooterRow: {},
      searchFooterTextWrapper: {},
      searchFooterText: {},
      searchFooterIcon: {},
    },
  }),
}));

describe('UrlAutocompleteSearchFooter', () => {
  const mockOnSelect = jest.fn();
  const mockHide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue('Google');
  });

  describe('rendering', () => {
    it('returns null when searchQuery is empty', () => {
      const { queryByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery=""
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(queryByTestId('url-autocomplete-search-engine')).toBeNull();
      expect(queryByTestId('url-autocomplete-go-to-url')).toBeNull();
    });

    it('renders search engine link when query is provided', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-search-engine')).toBeOnTheScreen();
    });

    it('renders URL link when query looks like a URL', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="metamask.io"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
      expect(getByTestId('url-autocomplete-search-engine')).toBeOnTheScreen();
    });

    it('does not render URL link when query is plain text', () => {
      const { queryByTestId, getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum blockchain"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(queryByTestId('url-autocomplete-go-to-url')).toBeNull();
      expect(getByTestId('url-autocomplete-search-engine')).toBeOnTheScreen();
    });
  });

  describe('URL detection', () => {
    it('detects URLs with http protocol', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="http://metamask.io"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
    });

    it('detects URLs with https protocol', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="https://metamask.io"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
    });

    it('detects URLs with path', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="metamask.io/portfolio"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
    });

    it('detects subdomains as URLs', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="portfolio.metamask.io"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
    });

    it('does not detect plain text as URL', () => {
      const { queryByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="hello world"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(queryByTestId('url-autocomplete-go-to-url')).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('calls onSelect and hide when URL link is pressed', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="metamask.io"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      fireEvent.press(getByTestId('url-autocomplete-go-to-url'));

      expect(mockHide).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith('metamask.io');
    });

    it('calls onSelect and hide with Google search URL when search link is pressed', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      fireEvent.press(getByTestId('url-autocomplete-search-engine'));

      expect(mockHide).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(
        'https://www.google.com/search?q=ethereum',
      );
    });

    it('encodes special characters in Google search query', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum & bitcoin"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      fireEvent.press(getByTestId('url-autocomplete-search-engine'));

      expect(mockOnSelect).toHaveBeenCalledWith(
        'https://www.google.com/search?q=ethereum%20%26%20bitcoin',
      );
    });

    it('calls onSelect with DuckDuckGo URL when DuckDuckGo is selected', () => {
      (useSelector as jest.Mock).mockReturnValue('DuckDuckGo');

      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      fireEvent.press(getByTestId('url-autocomplete-search-engine'));

      expect(mockOnSelect).toHaveBeenCalledWith(
        'https://duckduckgo.com/?q=ethereum',
      );
    });
  });

  describe('text display', () => {
    it('displays search query in Google search link', () => {
      const { getByText } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByText(/ethereum/)).toBeOnTheScreen();
      expect(getByText(/on Google/)).toBeOnTheScreen();
    });

    it('displays search query in DuckDuckGo link when DuckDuckGo is selected', () => {
      (useSelector as jest.Mock).mockReturnValue('DuckDuckGo');

      const { getByText } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByText(/ethereum/)).toBeOnTheScreen();
      expect(getByText(/on DuckDuckGo/)).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles URL with uppercase characters', () => {
      const { getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="MetaMask.IO"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-go-to-url')).toBeOnTheScreen();
    });

    it('handles query with emojis', () => {
      const { getByText, getByTestId } = render(
        <UrlAutocompleteSearchFooter
          searchQuery="ethereum 🚀"
          onSelect={mockOnSelect}
          hide={mockHide}
        />,
      );

      expect(getByTestId('url-autocomplete-search-engine')).toBeOnTheScreen();
      expect(getByText(/ethereum 🚀/)).toBeOnTheScreen();
    });
  });
});
