// Third party dependencies.
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, fireEvent } from '@testing-library/react-native';
import { KeyringTypes } from '@metamask/keyring-controller';

// external dependencies
import { Account, EnsByAccountAddress } from '../../../hooks/useAccounts';
import { NetworkAvatarProps } from '../AccountConnect.types';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AccountsConnectedItemList from './AccountsConnectedItemList';

type HandleEditAccountsButtonPress = () => void;

const mockAccounts: Account[] = [
  {
    address: '0x123',
    caipAccountId: 'eip155:1:0x123',
    name: 'Account 1',
    assets: { fiatBalance: '$100.00\nETH' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: true,
  },
  {
    address: '0x456',
    caipAccountId: 'eip155:1:0x456',
    name: 'Account 2',
    assets: { fiatBalance: '$200.00\nETH' },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
  },
];

const mockEnsByAccountAddress: EnsByAccountAddress = {
  '0x123': 'billybob.eth',
  '0x456': 'bobbybilly.eth',
};

const mockNetworkAvatars: NetworkAvatarProps[] = [
  {
    name: 'Ethereum',
    size: AvatarSize.Xs,
    imageSource: { uri: 'https://reactnative.dev/img/tiny_logo.png' },
    variant: AvatarVariant.Network,
  },
];

const mockStore = configureStore([]);
const initialState = {
  settings: {
    useBlockieIcon: false,
  },
};

function renderWithProvider(ui: React.ReactElement, state = initialState) {
  const store = mockStore(state);
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('AccountsConnectedItemList', () => {
  it('renders a list of accounts', () => {
    const { getByText } = renderWithProvider(
      <AccountsConnectedItemList
        selectedAddresses={['eip155:1:0x123', 'eip155:1:0x456']}
        ensByAccountAddress={mockEnsByAccountAddress}
        accounts={mockAccounts}
        privacyMode={false}
        networkAvatars={mockNetworkAvatars}
        handleEditAccountsButtonPress={jest.fn()}
      />,
    );

    expect(getByText('0x123...0x123')).toBeTruthy();
    expect(getByText('0x456...0x456')).toBeTruthy();
  });

  it('calls handleEditAccountsButtonPress when edit button is pressed', () => {
    const onEdit = jest.fn();
    const { getByText } = renderWithProvider(
      <AccountsConnectedItemList
        selectedAddresses={['eip155:1:0x123']}
        ensByAccountAddress={mockEnsByAccountAddress}
        accounts={mockAccounts}
        privacyMode={false}
        networkAvatars={mockNetworkAvatars}
        handleEditAccountsButtonPress={onEdit}
      />,
    );
    fireEvent.press(getByText('Edit accounts'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('hides balances when privacyMode is true', () => {
    const { getAllByTestId } = renderWithProvider(
      <AccountsConnectedItemList
        selectedAddresses={['eip155:1:0x123']}
        ensByAccountAddress={mockEnsByAccountAddress}
        accounts={mockAccounts}
        privacyMode
        networkAvatars={mockNetworkAvatars}
        handleEditAccountsButtonPress={
          jest.fn() as HandleEditAccountsButtonPress
        }
      />,
    );

    const balanceTestIds = getAllByTestId(/account-connected-item-/);
    balanceTestIds.forEach((node) => {
      expect(node.props.children[0].props.isHidden).toBe(true);
    });
  });
});
