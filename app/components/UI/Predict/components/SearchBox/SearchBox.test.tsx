import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SearchBox from './SearchBox';

// Mock Animated to avoid animation timing issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
      })),
    },
  };
});

// Mock the strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.search_placeholder': 'Search prediction markets',
      'predict.search_cancel': 'Cancel',
    };
    return mockStrings[key] || key;
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('SearchBox', () => {
  const mockOnSearch = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility behavior', () => {
    it('renders nothing when isVisible is false', () => {
      const { queryByTestId } = renderWithProvider(
        <SearchBox
          isVisible={false}
          onSearch={mockOnSearch}
          onCancel={mockOnCancel}
        />,
        { state: initialState },
      );

      expect(queryByTestId('search-box-container')).toBeNull();
    });

    it('renders search box when isVisible is true', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      expect(
        getByPlaceholderText('Search prediction markets'),
      ).toBeOnTheScreen();
    });
  });

  describe('Search functionality', () => {
    it('calls onSearch when user types in input', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');

      expect(mockOnSearch).toHaveBeenCalledWith('bitcoin');
    });

    it('updates input value when user types', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'ethereum');

      expect(input.props.value).toBe('ethereum');
    });

    it('calls onSearch with empty string when input is cleared', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');
      fireEvent.changeText(input, '');

      expect(mockOnSearch).toHaveBeenLastCalledWith('');
    });
  });

  describe('Clear functionality', () => {
    it('shows clear button when input has text', () => {
      const { getByPlaceholderText, getByTestId } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');

      expect(getByTestId('clear-button')).toBeOnTheScreen();
    });

    it('hides clear button when input is empty', () => {
      const { queryByTestId } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      // Input starts empty, so clear button should not be visible
      expect(queryByTestId('clear-button')).toBeNull();
    });

    it('clears input when clear button is pressed', () => {
      const { getByPlaceholderText, getByTestId } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');
      const clearButton = getByTestId('clear-button');
      fireEvent.press(clearButton);

      expect(input.props.value).toBe('');
      expect(mockOnSearch).toHaveBeenLastCalledWith('');
    });
  });

  describe('Cancel functionality', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const { getByText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('clears input when cancel button is pressed', () => {
      const { getByPlaceholderText, getByText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(input.props.value).toBe('');
    });
  });

  describe('Accessibility and UI elements', () => {
    it('displays search icon', () => {
      const { getByTestId } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      expect(getByTestId('search-icon')).toBeOnTheScreen();
    });

    it('displays cancel button text', () => {
      const { getByText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      expect(getByText('Cancel')).toBeOnTheScreen();
    });

    it('has autoFocus enabled on input', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      expect(input.props.autoFocus).toBe(true);
    });
  });

  describe('Component integration', () => {
    it('handles multiple search queries correctly', () => {
      const { getByPlaceholderText } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');
      fireEvent.changeText(input, 'ethereum');
      fireEvent.changeText(input, 'solana');

      expect(mockOnSearch).toHaveBeenCalledTimes(3);
      expect(mockOnSearch).toHaveBeenNthCalledWith(1, 'bitcoin');
      expect(mockOnSearch).toHaveBeenNthCalledWith(2, 'ethereum');
      expect(mockOnSearch).toHaveBeenNthCalledWith(3, 'solana');
    });

    it('maintains state correctly when visibility changes', () => {
      const { getByPlaceholderText, rerender } = renderWithProvider(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
        { state: initialState },
      );

      const input = getByPlaceholderText('Search prediction markets');
      fireEvent.changeText(input, 'bitcoin');

      rerender(
        <SearchBox
          isVisible={false}
          onSearch={mockOnSearch}
          onCancel={mockOnCancel}
        />,
      );

      rerender(
        <SearchBox isVisible onSearch={mockOnSearch} onCancel={mockOnCancel} />,
      );

      const newInput = getByPlaceholderText('Search prediction markets');
      expect(newInput.props.value).toBe('bitcoin');
    });
  });
});
