// Third party dependencies
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// Internal dependencies
import EditAccountName from './EditAccountName';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockSetAccountLabel = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setAccountLabel: () => mockSetAccountLabel,
    },
  },
}));

const initialState = {
  swaps: { '1': { isLive: true }, hasOnboarded: false, isLive: true },
  wizard: {
    step: 0,
  },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x',
        identities: {
          '0x': { name: 'Account 1', address: '0x' },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
  };
});

const renderComponent = (state: any) =>
  renderWithProvider(<EditAccountName />, { state });

describe('EditAccountName', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
  });
  it('should render correctly', () => {
    const { getByText, toJSON } = renderComponent(initialState);
    expect(getByText('Cancel')).toBeDefined();
    expect(getByText('Save')).toBeDefined();
    expect(getByText('Name')).toBeDefined();
    expect(getByText('Address')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should enable the save button when text input changes', () => {
    const { getByTestId } = renderComponent(initialState);
    const input = getByTestId('account-name-input');
    const saveButton = getByTestId('save-button');

    fireEvent.changeText(input, '');

    expect(saveButton.props.disabled).toBe(true);
    fireEvent.changeText(input, 'Account');

    expect(saveButton.props.disabled).toBe(false);
  });

  it('should call goBack when cancel button is pressed', () => {
    const { getByText } = renderComponent(initialState);
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should call navigate when save button is pressed', () => {
    const { getByTestId } = renderComponent(initialState);
    const input = getByTestId('account-name-input');
    const saveButton = getByTestId('save-button');
    fireEvent.changeText(input, 'New Name');
    fireEvent.press(saveButton);
    expect(mockNavigate).toHaveBeenCalled();
  });
});
