import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StateSelectorModal from './StateSelectorModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { createUnsupportedStateModalNavigationDetails } from '../UnsupportedStateModal/UnsupportedStateModal';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    { name: 'StateSelectorModal' },
    { state: { engine: { backgroundState } } },
  );
}

jest.mock('../../../Deposit/constants', () => ({
  US_STATES: [
    { code: 'CA', name: 'California' },
    { code: 'NY', name: 'New York' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' },
    { code: 'WA', name: 'Washington' },
  ],
}));

let mockUseParamsValues = {
  selectedState: undefined,
  onStateSelect: jest.fn(),
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      isFocused: jest.fn(() => true),
    }),
  };
});

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('StateSelectorModal (V2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsValues = {
      selectedState: undefined,
      onStateSelect: jest.fn(),
    };
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
    expect(queryByText('New York')).not.toBeOnTheScreen();
    const clearButton = getByTestId('textfield-endacccessory');
    fireEvent.press(clearButton);
    expect(queryByText('No states match')).not.toBeOnTheScreen();
  });

  it('calls onStateSelect when a supported state is pressed', () => {
    const { getByText } = renderWithProvider(StateSelectorModal);
    fireEvent.press(getByText('California'));
    expect(mockUseParamsValues.onStateSelect).toHaveBeenCalledWith('CA');
  });

  it('navigates to UnsupportedStateModal when NY is selected', () => {
    const { getByText } = renderWithProvider(StateSelectorModal);
    fireEvent.press(getByText('New York'));
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
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'Cal');
    expect(getByText('California')).toBeOnTheScreen();
    expect(queryByText('Texas')).not.toBeOnTheScreen();
  });

  it('filters states when searching by state code', () => {
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'NY');
    expect(getByText('New York')).toBeOnTheScreen();
    expect(queryByText('California')).not.toBeOnTheScreen();
  });

  it('renders initial list alphabetically sorted', () => {
    const { toJSON } = renderWithProvider(StateSelectorModal);
    const serialized = JSON.stringify(toJSON());
    const names = ['California', 'Florida', 'New York', 'Texas', 'Washington'];
    const positions = names.map((n) => serialized.indexOf(n));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('shows empty state message when no search results found', () => {
    const { getByPlaceholderText, getByText } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(
      getByPlaceholderText('Search by state'),
      'Nonexistent',
    );
    expect(getByText('No states match "Nonexistent"')).toBeOnTheScreen();
  });

  it('closes the modal when close button is pressed', () => {
    const { getByTestId } = renderWithProvider(StateSelectorModal);
    fireEvent.press(getByTestId('state-selector-close-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
