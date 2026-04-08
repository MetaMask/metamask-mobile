import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StateSelectorModal from './StateSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { createUnsupportedStateModalNavigationDetails } from '../UnsupportedStateModal/UnsupportedStateModal';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'StateSelectorModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.mock('../../../constants', () => ({
  US_STATES: [
    {
      code: 'CA',
      name: 'California',
    },
    {
      code: 'NY',
      name: 'New York',
    },
    {
      code: 'TX',
      name: 'Texas',
    },
    {
      code: 'FL',
      name: 'Florida',
    },
    {
      code: 'WA',
      name: 'Washington',
    },
  ],
}));

let mockUseParamsValues = {
  selectedState: undefined,
  onStateSelect: jest.fn(),
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDangerouslyGetParent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dangerouslyGetParent: mockDangerouslyGetParent,
      isFocused: jest.fn(() => true),
    }),
  };
});

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('StateSelectorModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsValues = {
      selectedState: undefined,
      onStateSelect: jest.fn(),
    };
  });

  describe('Behavior Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders search input and state list initially', () => {
      const { getByText, getByPlaceholderText } =
        renderWithProvider(StateSelectorModal);
      expect(getByPlaceholderText('Search by state')).toBeOnTheScreen();
      expect(getByText('California')).toBeOnTheScreen();
      expect(getByText('New York')).toBeOnTheScreen();
    });

    it('restores full list after clearing search', () => {
      const { getByPlaceholderText, getByTestId, queryByText } =
        renderWithProvider(StateSelectorModal);
      const searchInput = getByPlaceholderText('Search by state');
      fireEvent.changeText(searchInput, 'Cal');
      expect(queryByText('New York')).toBeNull();
      const clearButton = getByTestId('textfield-endacccessory');
      fireEvent.press(clearButton);
      expect(queryByText('No states match')).toBeNull();
    });

    it('calls onStateSelect when a state is selected', () => {
      const { getByText } = renderWithProvider(StateSelectorModal);
      const californiaState = getByText('California');
      fireEvent.press(californiaState);
      expect(mockUseParamsValues.onStateSelect).toHaveBeenCalledWith('CA');
    });

    it('navigates to unsupported state modal when NY is selected', () => {
      const { getByText } = renderWithProvider(StateSelectorModal);
      const newYorkState = getByText('New York');
      fireEvent.press(newYorkState);

      expect(mockUseParamsValues.onStateSelect).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        ...createUnsupportedStateModalNavigationDetails({
          stateCode: 'NY',
          stateName: 'New York',
          onStateSelect: mockUseParamsValues.onStateSelect,
        }),
      );
    });

    it('filters states when searching by name', () => {
      const { getByPlaceholderText, getByText, queryByText } =
        renderWithProvider(StateSelectorModal);
      const searchInput = getByPlaceholderText('Search by state');
      fireEvent.changeText(searchInput, 'Cal');
      expect(getByText('California')).toBeOnTheScreen();
      expect(queryByText('Texas')).toBeNull();
    });

    it('filters states when searching by code', () => {
      const { getByPlaceholderText, getByText, queryByText } =
        renderWithProvider(StateSelectorModal);

      const searchInput = getByPlaceholderText('Search by state');
      fireEvent.changeText(searchInput, 'CA');

      expect(getByText('California')).toBeOnTheScreen();
      expect(queryByText('Texas')).toBeNull();
    });

    it('shows empty state message when no search results found', () => {
      const { getByPlaceholderText, getByText } =
        renderWithProvider(StateSelectorModal);

      const searchInput = getByPlaceholderText('Search by state');
      fireEvent.changeText(searchInput, 'Nonexistent');

      expect(getByText('No states match "Nonexistent"')).toBeOnTheScreen();
    });

    it('closes the modal when close button is pressed', () => {
      const { getByTestId } = renderWithProvider(StateSelectorModal);

      const closeButton = getByTestId('state-selector-close-button');
      fireEvent.press(closeButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
