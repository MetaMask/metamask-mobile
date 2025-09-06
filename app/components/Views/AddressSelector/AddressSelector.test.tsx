import React from 'react';
import Routes from '../../../constants/navigation/Routes';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';

import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { EthScope, SolAccountType, SolScope } from '@metamask/keyring-api';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../util/test/initial-root-state';
import AddressSelector from './AddressSelector';
import { AddressSelectorParams } from './AddressSelector.types';
import { setReloadAccounts } from '../../../actions/accounts';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

const ACCOUNT_WALLET_ID = 'entropy:wallet-id-1' as AccountWalletId;
const ACCOUNT_GROUP_ID = 'entropy:wallet-id-1/1' as AccountGroupId;

const mockEthEoaAccount = {
  ...createMockInternalAccount(
    '0x4fec2622fb662e892dd0e5060b91fa49ddcfdcb5',
    'Eth Account 1',
  ),
  id: 'mock-eth-account-1',
  scopes: [EthScope.Eoa],
};

const mockSolAccount = {
  ...createMockInternalAccount(
    'FcdCd3moFy29rZDxjt9jhT5HpFB8VssD6c79g4UGPZgj',
    'Sol Account 1',
  ),
  id: 'mock-eth-account-2',
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
  type: SolAccountType.DataAccount,
};
const mockInitialState = {
  ...initialRootState,
  engine: {
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockEthEoaAccount.id]: mockEthEoaAccount,
            [mockSolAccount.id]: mockSolAccount,
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          selectedAccountGroup: ACCOUNT_GROUP_ID,
          wallets: {
            [ACCOUNT_WALLET_ID]: {
              id: ACCOUNT_WALLET_ID,
              metadata: { name: 'Mock Wallet' },
              groups: {
                [ACCOUNT_GROUP_ID]: {
                  accounts: [mockEthEoaAccount.id, mockSolAccount.id],
                  id: ACCOUNT_GROUP_ID,
                },
              },
            },
          },
        },
      },
    },
  },
  accounts: {
    reloadAccounts: false,
  },
};

jest.mock('../../hooks/useAccountName', () => ({
  useAccountName: () => 'Mock Account Name',
}));

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

function render(
  Component: React.ComponentType,
  state = mockInitialState,
  params: AddressSelectorParams | undefined = undefined,
) {
  return renderScreen(
    Component,
    {
      name: Routes.SHEET.ADDRESS_SELECTOR,
    },
    {
      state,
    },
    params,
  );
}

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and matches snapshot', () => {
    render(AddressSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('includes only EVM addresses if isEvmOnly', () => {
    const { queryAllByTestId } = render(AddressSelector, mockInitialState, {
      isEvmOnly: true,
    });

    const networkNames = queryAllByTestId(
      'multichain-address-row-network-name',
    ).map((node) => node.props.children);

    expect(networkNames).toEqual(['Ethereum Mainnet', 'Linea', 'Base Mainnet']);
    expect(networkNames).not.toContain('Solana');
  });

  it('includes only addresses from specified CAIP chain IDs', () => {
    const { queryAllByTestId } = render(AddressSelector, mockInitialState, {
      displayOnlyCaipChainIds: ['eip155:59144', 'eip155:8453'],
    });

    const networkNames = queryAllByTestId(
      'multichain-address-row-network-name',
    ).map((node) => node.props.children);
    expect(networkNames).toEqual(['Linea', 'Base Mainnet']);
    expect(networkNames).not.toContain('Ethereum Mainnet');
    expect(networkNames).not.toContain('Solana');
  });

  it('dispatches setReloadAccounts(false) if reloadAccounts is true in state', () => {
    const stateWithReload = {
      ...mockInitialState,
      accounts: {
        reloadAccounts: true,
      },
    };
    render(AddressSelector, stateWithReload);
    expect(mockDispatch).toHaveBeenCalledWith(setReloadAccounts(false));
  });

  it('calls setActiveNetwork when an address is pressed', () => {
    const { getByText } = render(AddressSelector);
    const lineaAccount = getByText('Linea');
    act(() => {
      fireEvent.press(lineaAccount);
    });
    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('linea-mainnet');
  });
});
