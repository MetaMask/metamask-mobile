// Third party dependencies
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// Internal dependencies
import EditAccountName from './EditAccountName';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockPreferencesSetAccountLabel = jest.fn();
const mockEngineSetAccountLabel = jest.fn();
const mockAccountsControllerSetAccountName = jest.fn();

jest.mock('../../../core/Engine', () => ({
  setAccountLabel: () => mockEngineSetAccountLabel,
  context: {
    PreferencesController: {
      setAccountLabel: () => mockPreferencesSetAccountLabel,
    },
    AccountsController: {
      setAccountName: () => mockAccountsControllerSetAccountName,
    },
  },
}));

const mockInitialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  wizard: {
    step: 0,
  },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              address: '0x0',
              id: '30313233-3435-4637-b839-383736353430',
              options: {},
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '30313233-3435-4637-b839-383736353430',
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
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
    mockPreferencesSetAccountLabel.mockClear();
    mockEngineSetAccountLabel.mockClear();
    mockAccountsControllerSetAccountName.mockClear();
  });
  it('should render correctly', () => {
    const { getByText, toJSON } = renderComponent(mockInitialState);
    expect(getByText('Cancel')).toBeDefined();
    expect(getByText('Save')).toBeDefined();
    expect(getByText('Name')).toBeDefined();
    expect(getByText('Address')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should enable the save button when text input changes', () => {
    const { getByTestId } = renderComponent(mockInitialState);
    const input = getByTestId('account-name-input');
    const saveButton = getByTestId('save-button');

    fireEvent.changeText(input, '');

    expect(saveButton.props.disabled).toBe(true);
    fireEvent.changeText(input, 'Account');

    expect(saveButton.props.disabled).toBe(false);
  });

  it('should call goBack when cancel button is pressed', () => {
    const { getByText } = renderComponent(mockInitialState);
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should call navigate when save button is pressed', () => {
    const { getByTestId } = renderComponent(mockInitialState);
    const input = getByTestId('account-name-input');
    const saveButton = getByTestId('save-button');
    fireEvent.changeText(input, 'New Name');
    fireEvent.press(saveButton);
    expect(mockNavigate).toHaveBeenCalled();
  });
});
