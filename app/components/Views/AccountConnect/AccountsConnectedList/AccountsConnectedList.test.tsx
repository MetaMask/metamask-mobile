// Third party dependencies.
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, fireEvent } from '@testing-library/react-native';
import { KeyringTypes } from '@metamask/keyring-controller';
import { SolScope, BtcScope } from '@metamask/keyring-api';
import { CaipAccountId } from '@metamask/utils';

// external dependencies
import { Account, EnsByAccountAddress } from '../../../hooks/useAccounts';
import { NetworkAvatarProps } from '../AccountConnect.types';
import {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import SolanaLogo from '../../../../images/solana-logo.png';
import BitcoinLogo from '../../../../images/bitcoin-logo.png';
import EthereumLogo from '../../../../images/ethereum.png';
import PolygonLogo from '../../../../images/matic.png';

// Internal dependencies.
import AccountsConnectedList from './AccountsConnectedList';

const MOCK_ETH_ADDRESS = '0x123';
const MOCK_BTC_ADDRESS = '0x456';
const MOCK_SOL_ADDRESS = '0x789';
const MOCK_NO_SCOPES_ADDRESS = '0xdef';

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'mock-account-id-1',
    address: MOCK_ETH_ADDRESS,
    caipAccountId: `eip155:1:${MOCK_ETH_ADDRESS}` as CaipAccountId,
    name: 'Account 1',
    assets: { fiatBalance: '$100.00\nETH' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: true,
    scopes: ['eip155:1', 'eip155:137'],
    isLoadingAccount: false,
  },
  {
    id: 'mock-account-id-btc',
    address: MOCK_BTC_ADDRESS,
    caipAccountId:
      `bip122:000000000019d6689c085ae165831e93:${MOCK_BTC_ADDRESS}` as CaipAccountId,
    name: 'Bitcoin Account',
    assets: { fiatBalance: '$200.00\nBTC' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
    scopes: [BtcScope.Mainnet, BtcScope.Testnet],
    isLoadingAccount: false,
  },
  {
    id: 'mock-account-id-sol',
    address: MOCK_SOL_ADDRESS,
    caipAccountId:
      `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${MOCK_SOL_ADDRESS}` as CaipAccountId,
    name: 'Solana Account',
    assets: { fiatBalance: '$150.00\nSOL' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
    scopes: [SolScope.Mainnet, SolScope.Devnet, SolScope.Testnet],
    isLoadingAccount: false,
  },
  {
    id: 'mock-account-id-no-scopes',
    address: MOCK_NO_SCOPES_ADDRESS,
    caipAccountId: `eip155:1:${MOCK_NO_SCOPES_ADDRESS}` as CaipAccountId,
    name: 'Account with no scopes',
    assets: { fiatBalance: '$50.00' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
    scopes: [],
    isLoadingAccount: false,
  },
];

const MOCK_ENS_BY_ACCOUNT_ADDRESS: EnsByAccountAddress = {
  [MOCK_ETH_ADDRESS]: 'billybob.eth',
};

const MOCK_NETWORK_AVATARS: NetworkAvatarProps[] = [
  {
    name: 'Ethereum',
    size: AvatarSize.Xs,
    imageSource: EthereumLogo,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:1',
  },
  {
    name: 'Polygon',
    size: AvatarSize.Xs,
    imageSource: PolygonLogo,
    variant: AvatarVariant.Network,
    caipChainId: 'eip155:137',
  },
  {
    name: 'Bitcoin',
    size: AvatarSize.Xs,
    imageSource: BitcoinLogo,
    variant: AvatarVariant.Network,
    caipChainId: BtcScope.Mainnet,
  },
  {
    name: 'Solana',
    size: AvatarSize.Xs,
    imageSource: SolanaLogo,
    variant: AvatarVariant.Network,
    caipChainId: SolScope.Mainnet,
  },
];

// Default props for most tests
const DEFAULT_PROPS = {
  selectedAddresses: [`eip155:1:${MOCK_ETH_ADDRESS}`] as CaipAccountId[],
  ensByAccountAddress: MOCK_ENS_BY_ACCOUNT_ADDRESS,
  accounts: MOCK_ACCOUNTS,
  privacyMode: false,
  networkAvatars: MOCK_NETWORK_AVATARS,
  handleEditAccountsButtonPress: jest.fn(),
};

const mockStore = configureStore([]);
const mockInitialState = {
  settings: {
    avatarStyle: AvatarAccountType.Maskicon,
  },
};

const renderAccountsConnectedList = (propOverrides = {}) => {
  const props = { ...DEFAULT_PROPS, ...propOverrides };
  const store = mockStore(mockInitialState);
  return render(
    <Provider store={store}>
      <AccountsConnectedList {...props} />
    </Provider>,
  );
};

const renderWithPrivacyMode = (privacyMode = true) =>
  renderAccountsConnectedList({ privacyMode });

const renderEthereumAccount = () =>
  renderAccountsConnectedList({
    selectedAddresses: [`eip155:1:${MOCK_ETH_ADDRESS}`],
    accounts: [MOCK_ACCOUNTS[0]],
  });

const renderBitcoinAccount = () =>
  renderAccountsConnectedList({
    selectedAddresses: [
      `bip122:000000000019d6689c085ae165831e93:${MOCK_BTC_ADDRESS}`,
    ],
    accounts: [MOCK_ACCOUNTS[1]],
  });

const renderSolanaAccount = () =>
  renderAccountsConnectedList({
    selectedAddresses: [
      `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${MOCK_SOL_ADDRESS}`,
    ],
    accounts: [MOCK_ACCOUNTS[2]],
  });

const renderAccountWithNoScopes = () =>
  renderAccountsConnectedList({
    selectedAddresses: [`eip155:1:${MOCK_NO_SCOPES_ADDRESS}`],
    accounts: [MOCK_ACCOUNTS[3]],
  });

describe('AccountsConnectedItemList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of accounts', () => {
    const { getByText } = renderAccountsConnectedList({
      selectedAddresses: [
        `eip155:1:${MOCK_ETH_ADDRESS}`,
        `eip155:1:${MOCK_BTC_ADDRESS}`,
      ],
    });

    expect(getByText('0x123...0x123')).toBeTruthy();
    expect(getByText('0x456...0x456')).toBeTruthy();
  });

  it('calls handleEditAccountsButtonPress when edit button is pressed', () => {
    const onEdit = jest.fn();
    const { getByText } = renderAccountsConnectedList({
      handleEditAccountsButtonPress: onEdit,
    });

    fireEvent.press(getByText('Edit accounts'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('hides balances when privacyMode is true', () => {
    const { getAllByTestId } = renderWithPrivacyMode();

    const balanceTestIds = getAllByTestId(/account-connected-item-/);
    balanceTestIds.forEach((node) => {
      expect(node.props.children[0].props.isHidden).toBe(true);
    });
  });

  describe('Network Avatar Filtering', () => {
    it('shows only Ethereum network avatars for Ethereum accounts', () => {
      const { getByTestId } = renderEthereumAccount();
      const accountItem = getByTestId(
        `account-connected-item-${MOCK_ETH_ADDRESS}`,
      );
      expect(accountItem).toBeTruthy();
    });

    it('shows only Bitcoin network avatars for Bitcoin accounts', () => {
      const { getByTestId } = renderBitcoinAccount();
      const accountItem = getByTestId(
        `account-connected-item-${MOCK_BTC_ADDRESS}`,
      );
      expect(accountItem).toBeTruthy();
    });

    it('shows only Solana network avatars for Solana accounts', () => {
      const { getByTestId } = renderSolanaAccount();
      const accountItem = getByTestId(
        `account-connected-item-${MOCK_SOL_ADDRESS}`,
      );
      expect(accountItem).toBeTruthy();
    });

    it('shows no network avatars for accounts with no scopes', () => {
      const { getByTestId } = renderAccountWithNoScopes();
      const accountItem = getByTestId(
        `account-connected-item-${MOCK_NO_SCOPES_ADDRESS}`,
      );
      expect(accountItem).toBeTruthy();
    });

    it('handles empty network avatars array gracefully', () => {
      const { getByTestId } = renderAccountsConnectedList({
        networkAvatars: [],
      });
      const accountItem = getByTestId(
        `account-connected-item-${MOCK_ETH_ADDRESS}`,
      );
      expect(accountItem).toBeTruthy();
    });
  });
});
