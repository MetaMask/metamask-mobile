import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { SolAccountType, EthScope, SolScope } from '@metamask/keyring-api';

import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { PrivateKeyListIds } from '../../../../../e2e/selectors/MultichainAccounts/PrivateKeyList.selectors';
import { strings } from '../../../../../locales/i18n';

import { PrivateKeyList } from './PrivateKeyList';

const ACCOUNT_WALLET_ID = 'entropy:wallet-id-1' as AccountWalletId;
const ACCOUNT_GROUP_ID = 'entropy:wallet-id-1/1' as AccountGroupId;

const TITLE = 'Private Key List';
const shortenedEthAddress = '0x4FeC2...fdcB5';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    title: TITLE,
    groupId: ACCOUNT_GROUP_ID,
  }),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: (password: string) => {
        if (password === 'correct-password') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('Wrong password'));
      },
      exportAccount: jest.fn().mockImplementation((password, address) => {
        if (password === 'correct-password') {
          return Promise.resolve(`mock-private-key-for-${address}`);
        }
        return Promise.reject(new Error('Wrong password'));
      }),
      state: {
        keyrings: [],
      },
    },
  },
}));

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

const renderWithPrivateKeyList = () => {
  const mockAccountsControllerState = {
    internalAccounts: {
      accounts: {
        [mockEthEoaAccount.id]: mockEthEoaAccount,
        [mockSolAccount.id]: mockSolAccount,
      },
    },
  };

  const mockAccountTreeControllerState = {
    accountTree: {
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
  };

  const mockNetworkControllerState = {
    networkConfigurationsByChainId: {
      0x1: {
        chainId: '0x1',
        name: 'Ethereum',
      },
      0xaa36a7: {
        chainId: '0xaa36a7',
        name: 'Sepolia Test Network',
      },
      0x2105: {
        chainId: '0x2105',
        name: 'Base',
      },
      0xa4b1: {
        chainId: '0xa4b1',
        name: 'Arbitrum One',
      },
    },
  };

  const mockMultichainNetworkController = {
    multichainNetworkConfigurationsByChainId: {
      [SolScope.Mainnet]: {
        name: 'Solana Mainnet',
        chainId: SolScope.Mainnet,
        isTestnet: false,
      },
      [SolScope.Testnet]: {
        name: 'Solana Testnet',
        chainId: SolScope.Testnet,
        isTestnet: true,
      },
      [SolScope.Devnet]: {
        name: 'Solana Devnet',
        chainId: SolScope.Devnet,
        isTestnet: true,
      },
    },
  };

  const mockState = {
    engine: {
      backgroundState: {
        AccountsController: mockAccountsControllerState,
        AccountTreeController: mockAccountTreeControllerState,
        NetworkController: mockNetworkControllerState,
        MultichainNetworkController: mockMultichainNetworkController,
      },
    },
  };

  return renderScreen(
    () => <PrivateKeyList />,
    {
      name: 'PrivateKeyList',
    },
    {
      state: mockState,
    },
  );
};

describe('PrivateKeyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders password input box correctly', () => {
    const { getByTestId } = renderWithPrivateKeyList();

    expect(getByTestId(PrivateKeyListIds.PASSWORD_TITLE)).toBeDefined();
    expect(getByTestId(PrivateKeyListIds.BANNER)).toBeDefined();
    expect(getByTestId(PrivateKeyListIds.PASSWORD_INPUT)).toBeDefined();
    expect(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON)).toBeDefined();
    expect(getByTestId(PrivateKeyListIds.CANCEL_BUTTON)).toBeDefined();
  });

  it('shows an error message for an incorrect password', async () => {
    const { getByTestId, findByTestId, queryByTestId } =
      renderWithPrivateKeyList();

    fireEvent.changeText(
      getByTestId(PrivateKeyListIds.PASSWORD_INPUT),
      'wrong-password',
    );
    fireEvent.press(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON));

    const errorMessage = await findByTestId(PrivateKeyListIds.PASSWORD_ERROR);
    expect(errorMessage).toBeOnTheScreen();
    expect(errorMessage).toHaveTextContent(
      strings('multichain_accounts.private_key_list.wrong_password'),
    );
    expect(queryByTestId(PrivateKeyListIds.LIST)).toBeNull();
  });

  it('reveals private key list for correct password and filters accounts', async () => {
    const { getByTestId, getByText, findByTestId, getAllByText } =
      renderWithPrivateKeyList();

    fireEvent.changeText(
      getByTestId(PrivateKeyListIds.PASSWORD_INPUT),
      'correct-password',
    );
    fireEvent.press(getByTestId(PrivateKeyListIds.CONTINUE_BUTTON));

    await findByTestId(PrivateKeyListIds.LIST);

    expect(getByText(TITLE)).toBeDefined();

    expect(getAllByText(shortenedEthAddress).length).toBe(3);
    expect(getByText('Ethereum')).toBeDefined();
    expect(getByText('Base')).toBeDefined();
    expect(getByText('Arbitrum One')).toBeDefined();
  });
});
