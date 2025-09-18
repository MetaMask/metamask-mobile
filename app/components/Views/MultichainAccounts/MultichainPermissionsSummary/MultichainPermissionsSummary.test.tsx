import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupId } from '@metamask/account-api';
import { CaipChainId } from '@metamask/utils';
import MultichainPermissionsSummary from './MultichainPermissionsSummary';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { RootState } from '../../../../reducers';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { PermissionSummaryBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/PermissionSummaryBottomSheet.selectors';
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Network/NetworkNonPemittedBottomSheet.selectors';

const mockOnEdit = jest.fn();
const mockOnEditNetworks = jest.fn();
const mockOnBack = jest.fn();
const mockOnCancel = jest.fn();
const mockOnConfirm = jest.fn();
const mockOnRevokeAll = jest.fn();
const mockOnCreateAccount = jest.fn();
const mockOnUserAction = jest.fn();
const mockOnAddNetwork = jest.fn();
const mockOnChooseFromPermittedNetworks = jest.fn();
const mockSetTabIndex = jest.fn();

const MOCK_GROUP_ID_1 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0' as AccountGroupId;
const MOCK_GROUP_ID_2 =
  'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1' as AccountGroupId;

const MOCK_CURRENT_PAGE_INFORMATION = {
  currentEnsName: '',
  icon: 'mock-favicon.ico',
  url: 'https://mock-dapp.example.com/',
};

const MOCK_NETWORK_AVATARS = [
  {
    name: 'Ethereum Mainnet',
    imageSource: { uri: 'test-network-avatar.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:1' as CaipChainId,
  },
  {
    name: 'Polygon',
    imageSource: { uri: 'test-polygon-avatar.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:137' as CaipChainId,
  },
];

const DEFAULT_MULTICHAIN_PERMISSIONS_SUMMARY_PROPS = {
  currentPageInformation: MOCK_CURRENT_PAGE_INFORMATION,
  selectedAccountGroupIds: [MOCK_GROUP_ID_1],
  networkAvatars: MOCK_NETWORK_AVATARS,
  onEdit: mockOnEdit,
  onEditNetworks: mockOnEditNetworks,
  onBack: mockOnBack,
  onCancel: mockOnCancel,
  onConfirm: mockOnConfirm,
  onRevokeAll: mockOnRevokeAll,
  onCreateAccount: mockOnCreateAccount,
  onUserAction: mockOnUserAction,
  onAddNetwork: mockOnAddNetwork,
  onChooseFromPermittedNetworks: mockOnChooseFromPermittedNetworks,
  setTabIndex: mockSetTabIndex,
};

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
      NetworkController: {
        ...backgroundState.NetworkController,
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
};

const renderMultichainPermissionsSummary = (propOverrides = {}) => {
  const props = {
    ...DEFAULT_MULTICHAIN_PERMISSIONS_SUMMARY_PROPS,
    ...propOverrides,
  };
  return renderWithProvider(<MultichainPermissionsSummary {...props} />, {
    state: mockInitialState,
  });
};

const renderWithTabState = (tabIndex = 0, setTabIndex = jest.fn()) =>
  renderMultichainPermissionsSummary({ tabIndex, setTabIndex });

const renderNetworkSwitchScenario = (overrides = {}) =>
  renderMultichainPermissionsSummary({
    customNetworkInformation: {
      chainName: 'Sepolia',
      chainId: '0xaa36a7',
    },
    isNetworkSwitch: true,
    selectedAccountGroupIds: [],
    networkAvatars: [],
    ...overrides,
  });

const renderNonDappNetworkSwitchScenario = (overrides = {}) =>
  renderMultichainPermissionsSummary({
    isNonDappNetworkSwitch: true,
    selectedAccountGroupIds: [],
    networkAvatars: [],
    ...overrides,
  });

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockOnChangeTab = jest.fn();
jest.mock('@tommasini/react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({
    children,
    onChangeTab,
  }: {
    children: React.ReactNode;
    onChangeTab?: (tabInfo: { i: number; ref: unknown }) => void;
  }) => {
    // Store the onChangeTab callback so we can call it in tests
    if (onChangeTab) {
      mockOnChangeTab.mockImplementation(onChangeTab);
    }
    return <>{children}</>;
  },
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image.png' })),
  isPerDappSelectedNetworkEnabled: jest.fn(() => true),
}));

jest.mock('../../../../selectors/selectedNetworkController', () => ({
  useNetworkInfo: jest.fn(() => ({
    networkName: 'Ethereum Mainnet',
    networkImageSource: { uri: 'mock-network-image.png' },
  })),
  selectNetworkName: jest.fn(() => 'Ethereum Mainnet'),
}));

describe('MultichainPermissionsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    const { getByTestId } = renderMultichainPermissionsSummary();
    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('renders for already connected state', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      isDisconnectAllShown: true,
    });
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
      ),
    ).toBeTruthy();
  });

  it('renders for network switch scenario', () => {
    const { getByTestId } = renderNetworkSwitchScenario();
    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('renders for non-dapp network switch scenario', () => {
    const { getByTestId } = renderNonDappNetworkSwitchScenario();
    expect(
      getByTestId(
        NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
      ),
    ).toBeTruthy();
  });

  it('renders with correct initial tab based on tabIndex prop', () => {
    const { getByTestId } = renderWithTabState(1);
    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('renders only the account permissions card when showAccountsOnly is true', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      showAccountsOnly: true,
    });
    expect(
      getByTestId(PermissionSummaryBottomSheetSelectorsIDs.CONTAINER),
    ).toBeTruthy();
  });

  it('renders only the network permissions card when showPermissionsOnly is true', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      showPermissionsOnly: true,
    });
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).toBeTruthy();
  });

  it('renders the tab view when both showAccountsOnly and showPermissionsOnly are false', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      showAccountsOnly: false,
      showPermissionsOnly: false,
    });
    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      onBack: mockOnBack,
    });

    const backButton = getByTestId(
      PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON,
    );
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      onConfirm: mockOnConfirm,
    });

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    fireEvent.press(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      onCancel: mockOnCancel,
    });

    const cancelButton = getByTestId(CommonSelectorsIDs.CANCEL_BUTTON);
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when account permissions card is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      onEdit: mockOnEdit,
    });

    const accountPermissionContainer = getByTestId(
      PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
    );
    fireEvent.press(accountPermissionContainer);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onEditNetworks when network permissions card is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      onEditNetworks: mockOnEditNetworks,
    });

    const editNetworksButton = getByTestId(
      ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
    );
    fireEvent.press(editNetworksButton);

    expect(mockOnEditNetworks).toHaveBeenCalledTimes(1);
  });

  it('calls onAddNetwork when add network button is pressed in non-dapp network switch', () => {
    const { getByTestId } = renderNonDappNetworkSwitchScenario({
      onAddNetwork: mockOnAddNetwork,
    });

    const addNetworkButton = getByTestId(
      NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
    );
    fireEvent.press(addNetworkButton);

    expect(mockOnAddNetwork).toHaveBeenCalledTimes(1);
  });

  it('calls onChooseFromPermittedNetworks when choose from permitted networks button is pressed', () => {
    const { getByTestId } = renderNonDappNetworkSwitchScenario({
      onChooseFromPermittedNetworks: mockOnChooseFromPermittedNetworks,
    });

    const chooseNetworksButton = getByTestId(
      NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
    );
    fireEvent.press(chooseNetworksButton);

    expect(mockOnChooseFromPermittedNetworks).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when showActionButtons is false', () => {
    const { queryByTestId } = renderMultichainPermissionsSummary({
      showActionButtons: false,
    });

    expect(queryByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeNull();
    expect(queryByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeNull();
  });

  it('hides disconnect all button when isDisconnectAllShown is false', () => {
    const { queryByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      isDisconnectAllShown: false,
    });

    expect(
      queryByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
      ),
    ).toBeNull();
  });

  it('shows disconnect all button when isAlreadyConnected and isDisconnectAllShown are true', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      isDisconnectAllShown: true,
    });

    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
      ),
    ).toBeTruthy();
  });

  it('hides back button in non-dapp network switch scenario', () => {
    const { queryByTestId } = renderNonDappNetworkSwitchScenario({
      onBack: mockOnBack,
    });

    expect(
      queryByTestId(PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
  });

  it('shows confirm button for network switch', () => {
    const { getByTestId } = renderNetworkSwitchScenario();

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    expect(confirmButton).toBeTruthy();
  });

  it('disables confirm button when no accounts or networks are selected', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      selectedAccountGroupIds: [],
      networkAvatars: [],
    });

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('displays account label for single connected account', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      selectedAccountGroupIds: [MOCK_GROUP_ID_1],
    });

    const accountPermissionContainer = getByTestId(
      PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
    );
    expect(accountPermissionContainer).toBeTruthy();
  });

  it('displays account label for multiple connected accounts', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      selectedAccountGroupIds: [MOCK_GROUP_ID_1, MOCK_GROUP_ID_2],
    });

    const accountPermissionContainer = getByTestId(
      PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER,
    );
    expect(accountPermissionContainer).toBeTruthy();
  });

  it('displays network label for single network', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      networkAvatars: [MOCK_NETWORK_AVATARS[0]],
    });
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).toBeTruthy();
  });

  it('displays network label for multiple networks', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      networkAvatars: MOCK_NETWORK_AVATARS,
    });
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).toBeTruthy();
  });

  it('calls custom onRevokeAll when disconnect all button is pressed', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      isDisconnectAllShown: true,
      onRevokeAll: mockOnRevokeAll,
    });

    const disconnectAllButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
    );
    fireEvent.press(disconnectAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'RevokeAllAccountPermissions',
      params: expect.objectContaining({
        onRevokeAll: expect.any(Function),
      }),
    });
  });

  it('falls back to default revoke behavior when no custom onRevokeAll is provided', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      isAlreadyConnected: true,
      isDisconnectAllShown: true,
      onRevokeAll: undefined,
    });

    const disconnectAllButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
    );
    fireEvent.press(disconnectAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'RevokeAllAccountPermissions',
      params: expect.objectContaining({
        onRevokeAll: expect.any(Function),
      }),
    });
  });

  it('renders with empty network avatars array', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      networkAvatars: [],
    });
    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('renders with single network avatar', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      networkAvatars: [MOCK_NETWORK_AVATARS[0]],
    });
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).toBeTruthy();
  });

  it('disables confirm button when no account groups are selected', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      selectedAccountGroupIds: [],
      networkAvatars: MOCK_NETWORK_AVATARS,
    });

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('disables confirm button when no networks are selected', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      selectedAccountGroupIds: [MOCK_GROUP_ID_1],
      networkAvatars: [],
    });

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('enables confirm button when both accounts and networks are selected', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      selectedAccountGroupIds: [MOCK_GROUP_ID_1],
      networkAvatars: MOCK_NETWORK_AVATARS,
    });

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    expect(confirmButton.props.disabled).toBe(false);
  });

  it('renders network avatars correctly', () => {
    const { getByTestId } = renderMultichainPermissionsSummary({
      networkAvatars: MOCK_NETWORK_AVATARS,
    });

    // Verify the component renders with network information
    expect(
      getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      ),
    ).toBeTruthy();
  });
});
