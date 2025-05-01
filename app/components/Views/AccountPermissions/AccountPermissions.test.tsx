import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountPermissions from './AccountPermissions';
import { ConnectedAccountsSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { fireEvent } from '@testing-library/react-native';
import { AccountPermissionsScreens } from './AccountPermissions.types';
import { updatePermittedChains, addPermittedAccounts } from '../../../core/Permissions';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../../e2e/selectors/Browser/NetworkConnectMultiSelector.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    PermissionController: {
      revokeAllPermissions: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [],
      }
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {}
        }
      }
    }
  },
}));

jest.mock('../../../core/Permissions', () => ({
  ...jest.requireActual('../../../core/Permissions'),
  updatePermittedChains: jest.fn(),
  addPermittedAccounts: jest.fn(),
}));
const mockUpdatePermittedChains = updatePermittedChains as jest.Mock;
const mockAddPermittedAccounts = addPermittedAccounts as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
}));

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

jest.mock('../../hooks/useAccounts', () => {
  const useAccountsMock = jest.fn(() => ({
    evmAccounts: [
      {
        name: 'Account 1',
        address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
      },
      {
        name: 'Account 2',
        address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
          tokens: [],
        },
        type: 'HD Key Tree',
        yOffset: 78,
        isSelected: false,
        balanceError: undefined,
      },
    ],
    accounts: [],
    ensByAccountAddress: {},
  }));
  return {
    useAccounts: useAccountsMock,
    Account: Object, // Mock for the Account type
  };
});

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('AccountPermissions', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle manage permissions button press and navigate to permissions summary', () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    const managePermissionsButton = getByTestId(
      ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
    );
    fireEvent.press(managePermissionsButton);

    expect(getByTestId('permission-summary-container')).toBeDefined();
  });

  it('should render connect more accounts screen when specified as initial screen', () => {
    const { getByText } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(getByText('Connect more accounts')).toBeDefined();
  });

  it('handles update permissions when networks are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState },
    );

    // Select a network
    const network = getByText('Ethereum Mainnet');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(mockUpdatePermittedChains).toHaveBeenCalledWith('test', [
      '0x1'
    ], true);
  });

  it('handles the revoke permissions modal when no networks are selected', async () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState },
    );

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });

  it('handles update permissions when accounts are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState },
    );

    // Select an account
    const account = getByText('Account 1');
    fireEvent.press(account);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'
    ]);
  });

  it('handles the revoke permissions modal when no accounts are selected', async () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState },
    );

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });
});
