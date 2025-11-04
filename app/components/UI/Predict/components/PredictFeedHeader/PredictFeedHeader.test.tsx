import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictFeedHeader from './PredictFeedHeader';

// Mock navigation
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    canGoBack: mockCanGoBack,
    goBack: mockGoBack,
  }),
}));

// Mock SearchBox component
jest.mock('../SearchBox', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const ReactLocal = jest.requireActual('react');
  return {
    __esModule: true,
    default: jest.fn(({ isVisible, onCancel, onSearch }) => {
      if (!isVisible) return null;
      return ReactLocal.createElement(
        'View',
        { testID: 'search-box-mock' },
        ReactLocal.createElement(
          'Pressable',
          { testID: 'mock-cancel-button', onPress: onCancel },
          null,
        ),
        ReactLocal.createElement(
          'Pressable',
          { testID: 'mock-search-trigger', onPress: () => onSearch('test') },
          null,
        ),
      );
    }),
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictFeedHeader', () => {
  const mockOnSearchToggle = jest.fn();
  const mockOnSearchCancel = jest.fn();
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockCanGoBack.mockClear();
    mockGoBack.mockClear();
    mockCanGoBack.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('default view', () => {
    it('displays Predictions heading when search is not visible', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByText('Predictions')).toBeOnTheScreen();
    });

    it('displays search toggle button when search is not visible', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('search-toggle-button')).toBeOnTheScreen();
    });

    it('does not display SearchBox when search is not visible', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(queryByTestId('search-box-mock')).toBeNull();
    });
  });

  describe('search toggle functionality', () => {
    it('calls onSearchToggle when search toggle button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert
      expect(mockOnSearchToggle).toHaveBeenCalledTimes(1);
    });

    it('does not call onSearchToggle when not pressed', () => {
      // Arrange & Act
      renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(mockOnSearchToggle).not.toHaveBeenCalled();
    });
  });

  describe('search visible view', () => {
    it('displays SearchBox when search is visible', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();
    });

    it('does not display Predictions heading when search is visible', () => {
      // Arrange & Act
      const { queryByText } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(queryByText('Predictions')).not.toBeOnTheScreen();
    });

    it('does not display search toggle button when search is visible', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(queryByTestId('search-toggle-button')).toBeNull();
    });
  });

  describe('SearchBox integration', () => {
    it('passes onSearchCancel prop to SearchBox', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const cancelButton = getByTestId('mock-cancel-button');
      fireEvent.press(cancelButton);

      // Assert
      expect(mockOnSearchCancel).toHaveBeenCalledTimes(1);
    });

    it('passes onSearch prop to SearchBox', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchTrigger = getByTestId('mock-search-trigger');
      fireEvent.press(searchTrigger);

      // Assert
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    it('passes isSearchVisible prop to SearchBox', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert - SearchBox is rendered, which means isVisible=true was passed
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();
    });
  });

  describe('visibility state changes', () => {
    it('switches from default view to search view', () => {
      // Arrange
      const { getByText, rerender, getByTestId, queryByText } =
        renderWithProvider(
          <PredictFeedHeader
            isSearchVisible={false}
            onSearchToggle={mockOnSearchToggle}
            onSearchCancel={mockOnSearchCancel}
            onSearch={mockOnSearch}
          />,
          { state: initialState },
        );

      // Assert initial state
      expect(getByText('Predictions')).toBeOnTheScreen();

      // Act - change to search visible
      rerender(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
      );

      // Assert - search view is displayed
      expect(queryByText('Predictions')).not.toBeOnTheScreen();
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();
    });

    it('switches from search view to default view', () => {
      // Arrange
      const { getByTestId, rerender, queryByTestId, getByText } =
        renderWithProvider(
          <PredictFeedHeader
            isSearchVisible
            onSearchToggle={mockOnSearchToggle}
            onSearchCancel={mockOnSearchCancel}
            onSearch={mockOnSearch}
          />,
          { state: initialState },
        );

      // Assert initial state
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();

      // Act - change to search not visible
      rerender(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
      );

      // Assert - default view is displayed
      expect(queryByTestId('search-box-mock')).toBeNull();
      expect(getByText('Predictions')).toBeOnTheScreen();
    });
  });

  describe('callback isolation', () => {
    it('does not call onSearch when search toggle button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert
      expect(mockOnSearch).not.toHaveBeenCalled();
      expect(mockOnSearchCancel).not.toHaveBeenCalled();
    });

    it('does not call onSearchToggle when SearchBox cancel is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const cancelButton = getByTestId('mock-cancel-button');
      fireEvent.press(cancelButton);

      // Assert
      expect(mockOnSearchToggle).not.toHaveBeenCalled();
      expect(mockOnSearchCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onSearchCancel when search toggle button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert
      expect(mockOnSearchCancel).not.toHaveBeenCalled();
    });

    it('does not call onSearchToggle or onSearch when SearchBox cancel is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const cancelButton = getByTestId('mock-cancel-button');
      fireEvent.press(cancelButton);

      // Assert
      expect(mockOnSearchToggle).not.toHaveBeenCalled();
      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('prop handling', () => {
    it('handles all callbacks correctly in sequence', () => {
      // Arrange
      const { getByTestId, rerender } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act - toggle search on
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert - only toggle was called
      expect(mockOnSearchToggle).toHaveBeenCalledTimes(1);
      expect(mockOnSearchCancel).not.toHaveBeenCalled();
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Act - rerender with search visible and search
      rerender(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
      );

      const searchTrigger = getByTestId('mock-search-trigger');
      fireEvent.press(searchTrigger);

      // Assert - search was called
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      // Act - cancel search
      const cancelButton = getByTestId('mock-cancel-button');
      fireEvent.press(cancelButton);

      // Assert - cancel was called
      expect(mockOnSearchCancel).toHaveBeenCalledTimes(1);
    });

    it('accepts different callback functions', () => {
      // Arrange
      const customToggle = jest.fn();
      const customCancel = jest.fn();
      const customSearch = jest.fn();

      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={customToggle}
          onSearchCancel={customCancel}
          onSearch={customSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert
      expect(customToggle).toHaveBeenCalledTimes(1);
      expect(mockOnSearchToggle).not.toHaveBeenCalled();
    });
  });

  describe('multiple interactions', () => {
    it('handles multiple toggle presses', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);
      fireEvent.press(searchToggleButton);
      fireEvent.press(searchToggleButton);

      // Assert
      expect(mockOnSearchToggle).toHaveBeenCalledTimes(3);
    });

    it('handles rapid state changes', () => {
      // Arrange
      const { rerender, queryByTestId, getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act & Assert - toggle visibility multiple times
      for (let i = 0; i < 5; i++) {
        const isVisible = i % 2 !== 0;
        rerender(
          <PredictFeedHeader
            isSearchVisible={isVisible}
            onSearchToggle={mockOnSearchToggle}
            onSearchCancel={mockOnSearchCancel}
            onSearch={mockOnSearch}
          />,
        );

        if (isVisible) {
          expect(getByTestId('search-box-mock')).toBeOnTheScreen();
          expect(queryByTestId('search-toggle-button')).toBeNull();
        } else {
          expect(getByTestId('search-toggle-button')).toBeOnTheScreen();
          expect(queryByTestId('search-box-mock')).toBeNull();
        }
      }
    });
  });

  describe('component structure', () => {
    it('maintains proper layout structure when search is not visible', () => {
      // Arrange & Act
      const { getByText, getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert - both heading and button are present
      expect(getByText('Predictions')).toBeOnTheScreen();
      expect(getByTestId('search-toggle-button')).toBeOnTheScreen();
    });

    it('renders only SearchBox when search is visible', () => {
      // Arrange & Act
      const { queryByText, getByTestId, queryByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert - only SearchBox is present
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();
      expect(queryByText('Predictions')).not.toBeOnTheScreen();
      expect(queryByTestId('search-toggle-button')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles undefined state gracefully', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert - renders without errors
      expect(getByText('Predictions')).toBeOnTheScreen();
    });

    it('renders correctly when isSearchVisible is explicitly false', () => {
      // Arrange & Act
      const { getByText, queryByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByText('Predictions')).toBeOnTheScreen();
      expect(queryByTestId('search-box-mock')).toBeNull();
    });

    it('renders correctly when isSearchVisible is explicitly true', () => {
      // Arrange & Act
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('search-box-mock')).toBeOnTheScreen();
      expect(queryByText('Predictions')).toBeNull();
    });
  });

  describe('callback execution', () => {
    it('executes onSearchToggle exactly once per press', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchToggleButton = getByTestId('search-toggle-button');
      fireEvent.press(searchToggleButton);

      // Assert
      expect(mockOnSearchToggle).toHaveBeenCalledTimes(1);
      expect(mockOnSearchToggle).toHaveBeenCalledWith();
    });

    it('passes correct argument to onSearch callback', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const searchTrigger = getByTestId('mock-search-trigger');
      fireEvent.press(searchTrigger);

      // Assert
      expect(mockOnSearch).toHaveBeenCalledWith('test');
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it('executes onSearchCancel exactly once per press', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const cancelButton = getByTestId('mock-cancel-button');
      fireEvent.press(cancelButton);

      // Assert
      expect(mockOnSearchCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSearchCancel).toHaveBeenCalledWith();
    });
  });

  describe('back button', () => {
    it('displays back button when search is not visible', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('back-button')).toBeOnTheScreen();
    });

    it('does not display back button when search is visible', () => {
      // Arrange & Act
      const { queryByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Assert
      expect(queryByTestId('back-button')).toBeNull();
    });

    it('calls goBack when back button is pressed and navigation can go back', () => {
      // Arrange
      mockCanGoBack.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to Wallet when back button is pressed and navigation cannot go back', () => {
      // Arrange
      mockCanGoBack.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome', {
        screen: 'WalletTabStackFlow',
        params: {
          screen: 'WalletView',
        },
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('handles multiple back button presses', () => {
      // Arrange
      mockCanGoBack.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(3);
    });

    it('does not interfere with search toggle when back button is pressed', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(
        <PredictFeedHeader
          isSearchVisible={false}
          onSearchToggle={mockOnSearchToggle}
          onSearchCancel={mockOnSearchCancel}
          onSearch={mockOnSearch}
        />,
        { state: initialState },
      );

      // Act
      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      // Assert
      expect(mockOnSearchToggle).not.toHaveBeenCalled();
      expect(mockOnSearchCancel).not.toHaveBeenCalled();
      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });
});
