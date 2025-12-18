import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ExploreSearchBar from './ExploreSearchBar';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('ExploreSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock selectBasicFunctionalityEnabled to return true by default
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectBasicFunctionalityEnabled) {
        return true;
      }
      return undefined;
    });
  });
  describe('Button Mode', () => {
    it('renders button with placeholder text', () => {
      const mockOnPress = jest.fn();

      const { getByTestId, getByText } = render(
        <ExploreSearchBar type="button" onPress={mockOnPress} />,
      );

      expect(getByTestId('explore-view-search-button')).toBeDefined();
      expect(getByText('Search tokens, sites, URLs')).toBeDefined();
    });

    it('calls onPress when button is pressed', () => {
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar type="button" onPress={mockOnPress} />,
      );

      fireEvent.press(getByTestId('explore-view-search-button'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not render TextInput in button mode', () => {
      const mockOnPress = jest.fn();

      const { queryByTestId } = render(
        <ExploreSearchBar type="button" onPress={mockOnPress} />,
      );

      expect(queryByTestId('explore-view-search-input')).toBeNull();
    });
  });

  describe('Interactive Mode', () => {
    it('renders TextInput with search query', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId, getByDisplayValue } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery="bitcoin"
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      expect(getByTestId('explore-view-search-input')).toBeDefined();
      expect(getByDisplayValue('bitcoin')).toBeDefined();
    });

    it('calls onSearchChange when text is entered', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const input = getByTestId('explore-view-search-input');

      fireEvent.changeText(input, 'ethereum');

      expect(mockOnSearchChange).toHaveBeenCalledWith('ethereum');
    });

    it('shows clear button when search query has text', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery="bitcoin"
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      expect(getByTestId('explore-search-clear-button')).toBeDefined();
    });

    it('sets clear button opacity to 0 when search query is empty', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const clearButton = getByTestId('explore-search-clear-button');

      expect(clearButton.props.style).toMatchObject({ opacity: 0 });
    });

    it('sets clear button opacity to 1 when search query has text', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery="bitcoin"
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const clearButton = getByTestId('explore-search-clear-button');

      expect(clearButton.props.style).toMatchObject({ opacity: 1 });
    });

    it('clears search query when clear button is pressed', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery="bitcoin"
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const clearButton = getByTestId('explore-search-clear-button');

      fireEvent.press(clearButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });

    it('shows cancel button when search is focused', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      expect(getByTestId('explore-search-cancel-button')).toBeDefined();
    });

    it('clears query and calls onCancel when cancel button is pressed', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery="bitcoin"
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const cancelButton = getByTestId('explore-search-cancel-button');

      fireEvent.press(cancelButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('sets autoFocus on TextInput based on type prop', () => {
      const mockOnSearchChange = jest.fn();
      const mockOnCancel = jest.fn();

      const { getByTestId } = render(
        <ExploreSearchBar
          type="interactive"
          searchQuery=""
          onSearchChange={mockOnSearchChange}
          onCancel={mockOnCancel}
        />,
      );

      const input = getByTestId('explore-view-search-input');

      expect(input.props.autoFocus).toBe(true);
    });
  });

  describe('basic functionality toggle', () => {
    it('displays sites-only placeholder when basic functionality is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBasicFunctionalityEnabled) {
          return false;
        }
        return undefined;
      });

      const mockOnPress = jest.fn();

      const { getByText } = render(
        <ExploreSearchBar type="button" onPress={mockOnPress} />,
      );

      expect(getByText('Search sites')).toBeDefined();
    });
  });
});
