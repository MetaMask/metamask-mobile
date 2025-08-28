import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';

import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import AddressSelector from './AddressSelector';
import initialRootState from '../../../util/test/initial-root-state';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { EthScope, SolAccountType, SolScope } from '@metamask/keyring-api';

// const mockAccounts = [
//   {
//     id: internalAccount1.id,
//     address: internalAccount1.address,
//     balance: '0x0',
//     name: internalAccount1.metadata.name,
//   },
//   {
//     id: internalSolanaAccount1.id,
//     address: internalSolanaAccount1.address,
//     balance: '0x0',
//     name: internalSolanaAccount1.metadata.name,
//   },
//   {
//     id: internalAccount2.id,
//     address: internalAccount2.address,
//     balance: '0x0',
//     name: internalAccount2.metadata.name,
//   },
// ];

// const mockEnsByAccountAddress = {
//   [internalAccount2.address]: 'test.eth',
// };

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
      NetworkController: {
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
      },
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
      MultichainNetworkController: {
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
      },
    },
  },
  accounts: {
    reloadAccounts: false,
  },
};

// Mock the Redux dispatch
// const mockDispatch = jest.fn();

// jest.mock('react-redux', () => ({
//   ...jest.requireActual('react-redux'),
//   useDispatch: () => mockDispatch,
//   useSelector: (selector: unknown) => {
//     // Default mock state for selectors
//     const mockState = {
//       engine: {
//         backgroundState: {
//           KeyringController: MOCK_KEYRING_CONTROLLER_STATE_WITH_SOLANA,
//           AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
//           AccountTreeController: {
//             accountTree: {
//               wallets: {},
//             },
//           },
//           PreferencesController: {
//             privacyMode: false,
//           },
//         },
//       },
//       accounts: {
//         reloadAccounts: false,
//       },
//       settings: {
//         useBlockieIcon: false,
//       },
//     };
//     return (selector as (mockState: unknown) => unknown)(mockState);
//   },
// }));

// jest.mock('../../../core/Engine', () => {
//   const {
//     MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState,
//     MOCK_KEYRING_CONTROLLER_STATE: KeyringControllerState,
//   } = jest.requireActual('../../../util/test/accountsControllerTestUtils');
//   return {
//     context: {
//       KeyringController: {
//         state: KeyringControllerState,
//         importAccountWithStrategy: jest.fn(),
//       },
//       AccountsController: {
//         state: {
//           internalAccounts: AccountsControllerState.internalAccounts,
//         },
//       },
//       AccountTreeController: {
//         setSelectedAccountGroup: jest.fn(),
//       },
//     },
//     setSelectedAddress: jest.fn(),
//   };
// });

function render(Component: React.ComponentType, state = mockInitialState) {
  return renderScreen(
    Component,
    {
      name: Routes.SHEET.ADDRESS_SELECTOR,
    },
    {
      state,
    },
  );
}

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(AddressSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  // it('includes all accounts', () => {
  //   const { queryByText } = renderScreen(
  //     AccountSelectorWrapper,
  //     {
  //       name: Routes.SHEET.ACCOUNT_SELECTOR,
  //     },
  //     {
  //       state: mockInitialState,
  //     },
  //     mockRoute.params,
  //   );

  //   const accountsList = screen.getByTestId(
  //     AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
  //   );

  //   expect(accountsList).toBeDefined();
  //   expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
  //   expect(queryByText(internalSolanaAccount1.metadata.name)).toBeDefined();
  //   expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  // });

  // it('includes only EVM accounts if isEvmOnly', () => {
  //   const { queryByText } = renderScreen(
  //     AccountSelectorWrapper,
  //     {
  //       name: Routes.SHEET.ACCOUNT_SELECTOR,
  //     },
  //     {
  //       state: mockInitialState,
  //     },
  //     { ...mockRoute.params, isEvmOnly: true },
  //   );

  //   const accountsList = screen.getByTestId(
  //     AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
  //   );

  //   expect(accountsList).toBeDefined();
  //   expect(queryByText(internalAccount1.metadata.name)).toBeDefined();
  //   expect(queryByText(internalSolanaAccount1.metadata.name)).toBeNull();
  //   expect(queryByText(internalAccount2.metadata.name)).toBeDefined();
  // });

  // it('should display add account button', () => {
  //   renderScreen(
  //     AccountSelectorWrapper,
  //     {
  //       name: Routes.SHEET.ACCOUNT_SELECTOR,
  //     },
  //     {
  //       state: mockInitialState,
  //     },
  //     mockRoute.params,
  //   );

  //   const addButton = screen.getByTestId(
  //     AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
  //   );
  //   expect(addButton).toBeDefined();
  // });

  // it('renders account selector with multichain support', () => {
  //   renderScreen(
  //     AccountSelectorWrapper,
  //     {
  //       name: Routes.SHEET.ACCOUNT_SELECTOR,
  //     },
  //     {
  //       state: mockInitialState,
  //     },
  //     mockRoute.params,
  //   );

  //   // Should render the account list (either multichain or EVM based on feature flag)
  //   const accountsList = screen.getByTestId(
  //     AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
  //   );
  //   expect(accountsList).toBeDefined();
  // });
});
