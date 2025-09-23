import React from 'react';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { EthScope } from '@metamask/keyring-api';
import PermissionsSummary from './PermissionsSummary';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar/Avatar.types';

const mockedNavigate = jest.fn();

const MOCK_ACCOUNT_ADDRESS = '0xS0M3FAk3ADDr355Dc8Ebf7A2152cdfB9D43FAk3';
const MOCK_CAIP_ACCOUNT_ID =
  `${EthScope.Eoa}:${MOCK_ACCOUNT_ADDRESS}` as CaipAccountId;

const MOCK_ACCOUNTS = [
  {
    id: 'mock-account-id-2',
    name: 'Account 2',
    address: MOCK_ACCOUNT_ADDRESS,
    isSelected: true,
    assets: {
      fiatBalance: '$3200',
    },
    caipAccountId: MOCK_CAIP_ACCOUNT_ID,
    yOffset: 0,
    type: KeyringTypes.simple,
    isLoadingAccount: false,
    scopes: [EthScope.Eoa],
  },
];

const MOCK_CURRENT_PAGE_INFORMATION = {
  currentEnsName: '',
  icon: '',
  url: 'https://app.uniswap.org/',
};

const MOCK_NETWORK_AVATARS = [
  {
    name: 'Ethereum Mainnet',
    imageSource: { uri: 'test-network-avatar.png' },
    size: AvatarSize.Xs,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:1' as CaipChainId,
  },
];

const DEFAULT_PERMISSIONS_SUMMARY_PROPS = {
  currentPageInformation: MOCK_CURRENT_PAGE_INFORMATION,
  accounts: MOCK_ACCOUNTS,
  accountAddresses: [MOCK_CAIP_ACCOUNT_ID],
  networkAvatars: MOCK_NETWORK_AVATARS,
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderPermissionsSummary = (propOverrides = {}) => {
  const props = { ...DEFAULT_PERMISSIONS_SUMMARY_PROPS, ...propOverrides };
  return renderWithProvider(<PermissionsSummary {...props} />, {
    state: mockInitialState,
  });
};

const renderWithTabState = (tabIndex = 0, setTabIndex = jest.fn()) =>
  renderPermissionsSummary({ tabIndex, setTabIndex });

const renderNetworkSwitchScenario = (overrides = {}) =>
  renderPermissionsSummary({
    customNetworkInformation: {
      chainName: 'Sepolia',
      chainId: '0x1',
    },
    isNetworkSwitch: true,
    accounts: [],
    accountAddresses: [],
    networkAvatars: [],
    ...overrides,
  });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockedNavigate,
    }),
  };
});

const mockOnChangeTab = jest.fn();
jest.mock('react-native-scrollable-tab-view', () => ({
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

describe('PermissionsSummary', () => {
  it('should render correctly for network switch', () => {
    const { toJSON } = renderNetworkSwitchScenario();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly', () => {
    const { toJSON } = renderPermissionsSummary();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render only the account permissions card when showAccountsOnly is true', () => {
    const { toJSON } = renderPermissionsSummary({ showAccountsOnly: true });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render only the network permissions card when showPermissionsOnly is true', () => {
    const { toJSON } = renderPermissionsSummary({ showPermissionsOnly: true });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the tab view when both showAccountsOnly and showPermissionsOnly are false', () => {
    const { toJSON } = renderPermissionsSummary({
      showAccountsOnly: false,
      showPermissionsOnly: false,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render with the correct initial tab based on tabIndex prop', () => {
    const { toJSON } = renderWithTabState(1);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call setTabIndex when tab changes', () => {
    const mockSetTabIndex = jest.fn();
    renderWithTabState(0, mockSetTabIndex);

    mockOnChangeTab({ i: 1, ref: null });

    expect(mockSetTabIndex).toHaveBeenCalledWith(1);
  });
});
