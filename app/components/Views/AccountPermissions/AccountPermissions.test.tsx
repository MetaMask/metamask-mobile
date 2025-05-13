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
import { updatePermittedChains, addPermittedAccounts, removePermittedAccounts } from '../../../core/Permissions';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../../e2e/selectors/Browser/NetworkConnectMultiSelector.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { Hex } from '@metamask/utils';

const MOCK_ACCOUNTS = [      {
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
  caipAccountId: 'eip155:0:0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'
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
  caipAccountId: 'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7'
}];

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
      listAccounts: jest.fn(() => MOCK_ACCOUNTS),
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
  removePermittedAccounts: jest.fn(),
}));
const mockUpdatePermittedChains = updatePermittedChains as jest.Mock;
const mockAddPermittedAccounts = addPermittedAccounts as jest.Mock;
const mockRemovePermittedAccounts = removePermittedAccounts as jest.Mock;

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
    evmAccounts: MOCK_ACCOUNTS,
    accounts: MOCK_ACCOUNTS,
    ensByAccountAddress: {},
  }));
  return {
    useAccounts: useAccountsMock,
    Account: Object, // Mock for the Account type
  };
});

const mockInitialState = (accounts: Hex[] = ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272']): DeepPartial<RootState> => ({
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PermissionController: {
        subjects: {
          'test': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [{
                  type: Caip25CaveatType,
                  value: {
                    requiredScopes: {},
                    optionalScopes: {
                      'eip155:1': {
                        accounts: accounts.map(account => `eip155:1:${account}`)
                      }
                    }
                  }
                }]
              }
            }
          }
        }
      }
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
});

describe('AccountPermissions', () => {
  beforeEach(() => {
    mockUpdatePermittedChains.mockReset();
    mockAddPermittedAccounts.mockReset();
    mockRemovePermittedAccounts.mockReset();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState() },
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
      { state: mockInitialState() },
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
      { state: mockInitialState() },
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
      { state: mockInitialState() },
    );

    // Select a network
    const network = getByText('Sepolia');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(mockUpdatePermittedChains).toHaveBeenCalledWith('test', [
      'eip155:1',
      'eip155:11155111',
    ], true);
  });

  it('handles the revoke permissions modal when no networks are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect existing permitted chain
    const network = getByText('Ethereum Mainnet');
    fireEvent.press(network);

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });

  it('handles update permissions when accounts are selected from connect more view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7'
    ]);
  });

  it('handles update permissions when accounts are added from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7'
    ]);
    expect(mockRemovePermittedAccounts).not.toHaveBeenCalled();
  });

  it('handles update permissions when accounts are removed from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState(['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272', '0xd018538C87232FF95acbCe4870629b75640a78E7'])},
    );

    // Unselect exsting permitted account
    const existingAccount = getByText('Account 1');
    fireEvent.press(existingAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).not.toHaveBeenCalled();
    expect(mockRemovePermittedAccounts).toHaveBeenCalledWith('test', [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'
    ]);
  });

  it('handles update permissions when accounts are added and removed from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect exsting permitted account
    const existingAccount = getByText('Account 1');
    fireEvent.press(existingAccount);

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7'
    ]);
    expect(mockRemovePermittedAccounts).toHaveBeenCalledWith('test', [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'
    ]);
  });

  it('handles the revoke permissions modal when no accounts are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect existing permitted account
    const account = getByText('Account 1');
    fireEvent.press(account);

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });
});
