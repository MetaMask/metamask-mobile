import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StateSelectorModal from './StateSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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

let mockUseParamsValues = {
  selectedState: undefined,
  onStateSelect: jest.fn(),
};

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../UnsupportedStateModal/UnsupportedStateModal', () => ({
  createUnsupportedStateModalNavigationDetails: jest.fn(() => [
    'UnsupportedStateModal',
  ]),
}));

describe('StateSelectorModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParamsValues = {
      selectedState: undefined,
      onStateSelect: jest.fn(),
    };
  });

  it('renders initial state correctly', () => {
    const { toJSON } = renderWithProvider(StateSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders filtered state when searching by name', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'California');
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders filtered state when searching by code', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'CA');
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state when no search results found', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(
      getByPlaceholderText('Search by state'),
      'Nonexistent State',
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders partial search results', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'Cal');
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders cleared search state', () => {
    const { getByPlaceholderText, getByTestId, toJSON } =
      renderWithProvider(StateSelectorModal);
    fireEvent.changeText(getByPlaceholderText('Search by state'), 'Cal');
    const clearButton = getByTestId('textfield-endacccessory');
    fireEvent.press(clearButton);
    expect(toJSON()).toMatchSnapshot();
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
    expect(mockNavigate).toHaveBeenCalledWith('UnsupportedStateModal');
  });
});
