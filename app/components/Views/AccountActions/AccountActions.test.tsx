import React from 'react';
import Share from 'react-native-share';

import { Alert, AlertButton } from 'react-native';

import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';

import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import AccountActions from './AccountActions';
import { AccountActionsModalSelectorsIDs } from '../../../../e2e/selectors/Modals/AccountActionsModal.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

import { strings } from '../../../../locales/i18n';
import { act } from '@testing-library/react-hooks';

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  ...jest.requireActual('../../../core/Engine'),
  context: {
    PreferencesController: {
      selectedAddress: `0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756`,
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'Ledger Hardware',
            accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
          },
          {
            type: 'HD Key Tree',
            accounts: ['0xa1e359811322d97991e03f863a0c30c2cf029cd'],
          },
        ],
      },
      getAccounts: jest.fn(),
      removeAccount: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));

const mockEngine = jest.mocked(Engine);

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
    useRoute: () => ({
      params: {
        selectedAccount: {
          address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
          metadata: {
            keyring: {
              type: 'HD Key Tree',
            },
          },
        },
      },
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn().mockResolvedValue(true),
}));

describe('AccountActions', () => {
  const mockKeyringController = mockEngine.context.KeyringController;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Alert, 'alert');
  });

  it('renders all actions', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    expect(
      getByTestId(AccountActionsModalSelectorsIDs.EDIT_ACCOUNT),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsModalSelectorsIDs.VIEW_ETHERSCAN),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsModalSelectorsIDs.SHARE_ADDRESS),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsModalSelectorsIDs.SHOW_PRIVATE_KEY),
    ).toBeDefined();
  });

  it('navigates to webview when View on Etherscan is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsModalSelectorsIDs.VIEW_ETHERSCAN),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io/address/0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        title: 'etherscan.io',
      },
    });
  });

  it('opens the Share sheet when Share my public address is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(AccountActionsModalSelectorsIDs.SHARE_ADDRESS));

    expect(Share.open).toHaveBeenCalledWith({
      message: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
    });
  });

  it('navigates to the export private key screen when Show private key is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsModalSelectorsIDs.SHOW_PRIVATE_KEY),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
      {
        credentialName: 'private_key',
        shouldUpdateNav: true,
        selectedAccount: {
          address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
          metadata: {
            keyring: {
              type: 'HD Key Tree',
            },
          },
        },
      },
    );
  });

  it('clicks edit account', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(AccountActionsModalSelectorsIDs.EDIT_ACCOUNT));

    expect(mockNavigate).toHaveBeenCalledWith('EditAccountName', {
      selectedAccount: {
        address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        metadata: {
          keyring: {
            type: 'HD Key Tree',
          },
        },
      },
    });
  });

  describe('clicks remove account', () => {
    it('clicks remove button after popup shows to trigger the remove account process', async () => {
      mockKeyringController.getAccounts.mockResolvedValue([
        '0xa1e359811322d97991e03f863a0c30c2cf029cd',
      ]);

      const { getByTestId, getByText } = renderWithProvider(
        <AccountActions />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        getByTestId(AccountActionsModalSelectorsIDs.REMOVE_HARDWARE_ACCOUNT),
      );

      const alertFnMock = Alert.alert as jest.MockedFn<typeof Alert.alert>;

      expect(alertFnMock).toHaveBeenCalled();

      //Check Alert title and description match.
      expect(alertFnMock.mock.calls[0][0]).toBe(
        strings('accounts.remove_hardware_account'),
      );
      expect(alertFnMock.mock.calls[0][1]).toBe(
        strings('accounts.remove_hw_account_alert_description'),
      );

      //Click remove button
      await act(async () => {
        const alertButtons = alertFnMock.mock.calls[0][2] as AlertButton[];
        if (alertButtons[1].onPress !== undefined) {
          alertButtons[1].onPress();
        }
      });

      await waitFor(() => {
        expect(getByText(strings('common.please_wait'))).toBeDefined();
      });
    });
  });
});
