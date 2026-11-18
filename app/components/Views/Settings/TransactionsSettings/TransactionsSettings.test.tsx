import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TransactionsSettings from './index';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';

const initialState = {
  settings: { showHexData: false },
  user: { passwordSet: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        smartTransactionsOptInStatus: false,
      },
    },
  },
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
    }),
  };
});

describe('TransactionsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(<TransactionsSettings />, {
      state: initialState,
    });
    expect(getByTestId('header')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<TransactionsSettings />, {
      state: initialState,
    });
    const header = getByTestId('header');
    const backButton = within(header).getByTestId('button-icon');
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders smart transactions toggle', () => {
    const { getByLabelText } = renderWithProvider(<TransactionsSettings />, {
      state: initialState,
    });
    const toggle = getByLabelText(
      strings('app_settings.smart_transactions_opt_in_heading'),
    );
    expect(toggle).toBeTruthy();
  });

  it('renders show hex data toggle', () => {
    const { getByLabelText } = renderWithProvider(<TransactionsSettings />, {
      state: initialState,
    });
    const toggle = getByLabelText(strings('app_settings.show_hex_data'));
    expect(toggle).toBeTruthy();
  });
});
