// Third party dependencies.
import React from 'react';
import { screen } from '@testing-library/react-native';
import {
  NetworkConfiguration,
  NetworkStatus,
  RpcEndpointType,
} from '@metamask/network-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';

// External dependencies.
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import Routes from '../../../constants/navigation/Routes';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { NETWORK_CHAIN_ID } from '../../../util/networks/customNetworks';

// Internal dependencies.
import {
  AccountSelectorParams,
  AccountSelectorProps,
} from './AccountSelector.types';
import AccountSelector from './AccountSelector';

const mockAccounts = [
  {
    address: MOCK_ADDRESS_1,
    balance: '0x0',
    name: 'Account 1',
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
    assets: {
      fiatBalance: '$0\nETH',
    },
    balanceError: undefined,
  },
  {
    address: MOCK_ADDRESS_2,
    balance: '0x0',
    name: 'Account 2',
    type: KeyringTypes.hd,
    yOffset: 78,
    isSelected: true,
    assets: {
      fiatBalance: '$0.01\nETH',
    },
    balanceError: undefined,
  },
];

const MOCK_TOKEN_ADDRESS_1 = '0x378afc9a77b47a30';
const MOCK_TOKEN_ADDRESS_2 = '0x2f18e6';
const MOCK_TOKEN_ADDRESS_3 = '0x5d512b2498936';
const MOCK_TOKEN_ADDRESS_4 = '0x0D1E753a25eBda689453309112904807625bEFBe';

const mockEnsByAccountAddress = {
  [MOCK_ADDRESS_1]: 'test_1.eth',
  [MOCK_ADDRESS_2]: 'test_2.eth',
};

const mockNetworkConfigurations: Record<Hex, NetworkConfiguration> = {
  [NETWORK_CHAIN_ID.MAINNET]: {
    chainId: NETWORK_CHAIN_ID.MAINNET,
    nativeCurrency: 'ETH',
    name: 'Ethereum Mainnet',
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'infura-mainnet',
        type: RpcEndpointType.Custom,
        url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
        name: 'Infura',
      },
    ],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  [NETWORK_CHAIN_ID.POLYGON]: {
    chainId: NETWORK_CHAIN_ID.POLYGON,
    nativeCurrency: 'MATIC',
    name: 'Polygon',
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'custom-network',
        type: RpcEndpointType.Custom,
        url: 'https://polygon-rpc.com',
        name: 'Polygon RPC',
      },
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
};

const mockInitialState = {
  engine: {
    backgroundState: {
      KeyringController: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
          },
        ],
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: undefined,
        multichainNetworkConfigurationsByChainId: {},
      },
      TokenRatesController: {
        contractExchangeRates: {},
        marketData: {
          '0x1': {
            [MOCK_TOKEN_ADDRESS_1]: {
              price: 3000,
            },
            [MOCK_TOKEN_ADDRESS_2]: {
              price: 1000,
            },
          },
          '0x89': {
            [MOCK_TOKEN_ADDRESS_3]: {
              price: 5000,
            },
            [MOCK_TOKEN_ADDRESS_4]: {
              price: 2000,
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          [NETWORK_CHAIN_ID.MAINNET]: {},
          [NETWORK_CHAIN_ID.POLYGON]: {},
        },
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '0x0',
            stakedBalance: '0x0',
          },
          [MOCK_ADDRESS_2]: {
            balance: '0x5',
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'custom-network',
        networkConfigurationsByChainId: mockNetworkConfigurations,
        networksMetadata: {
          'custom-network': {
            status: NetworkStatus.Available,
            EIPS: {},
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_1.toLowerCase() as Hex]: {
            [NETWORK_CHAIN_ID.MAINNET]: {
              [MOCK_TOKEN_ADDRESS_1]: '0x378afc9a77b47a30' as Hex,
              [MOCK_TOKEN_ADDRESS_2]: '0x2f18e6' as Hex,
            },
            [NETWORK_CHAIN_ID.POLYGON]: {
              [MOCK_TOKEN_ADDRESS_3]: '0x5d512b2498936' as Hex,
              [MOCK_TOKEN_ADDRESS_4]: '0x5d512b2498936' as Hex,
            },
          },
          [MOCK_ADDRESS_2.toLowerCase() as Hex]: {
            [NETWORK_CHAIN_ID.MAINNET]: {
              [MOCK_TOKEN_ADDRESS_1]: '0x378afc9a77b47a30' as Hex,
              [MOCK_TOKEN_ADDRESS_2]: '0x2f18e6' as Hex,
            },
            [NETWORK_CHAIN_ID.POLYGON]: {
              [MOCK_TOKEN_ADDRESS_3]: '0x5d512b2498936' as Hex,
              [MOCK_TOKEN_ADDRESS_4]: '0x5d512b2498936' as Hex,
            },
          },
        },
      },
      PreferencesController: {
        privacyMode: false,
        tokenNetworkFilter: {
          [NETWORK_CHAIN_ID.MAINNET]: 'true',
          [NETWORK_CHAIN_ID.POLYGON]: 'true',
        },
      },
    },
  },
  accounts: {
    reloadAccounts: false,
  },
  settings: {
    useBlockieIcon: false,
  },
};

jest.mock('../../../components/hooks/useMultiAccountChainBalances', () => ({
  useMultiAccountChainBalances: jest.fn().mockReturnValue({
    ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'.toLowerCase()]: {
      ['0x1' as Hex]: {
        totalNativeFiatBalance: 100,
        totalImportedTokenFiatBalance: 50,
        totalFiatBalance: 150,
      },
      ['0x89' as Hex]: {
        totalNativeFiatBalance: 20,
        totalImportedTokenFiatBalance: 10,
        totalFiatBalance: 30,
      },
    },
    ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'.toLowerCase()]: {
      ['0x1' as Hex]: {
        totalNativeFiatBalance: 200,
        totalImportedTokenFiatBalance: 100,
        totalFiatBalance: 300,
      },
      ['0x89' as Hex]: {
        totalNativeFiatBalance: 40,
        totalImportedTokenFiatBalance: 20,
        totalFiatBalance: 60,
      },
    },
  }),
}));

// Mock the Redux dispatch
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (selector: any) => selector(mockInitialState),
}));

jest.mock('../../../components/hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockReturnValue({
    accounts: mockAccounts,
    ensByAccountAddress: mockEnsByAccountAddress,
    isLoading: false,
  }),
}));

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

const mockRoute: AccountSelectorProps['route'] = {
  params: {
    onSelectAccount: jest.fn((address: string) => address),
    checkBalanceError: (balance: string) => balance,
    disablePrivacyMode: false,
  } as AccountSelectorParams,
};

const AccountSelectorWrapper = () => <AccountSelector route={mockRoute} />;

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
        options: {},
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should display accounts list', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );

    const accountsList = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
    );
    expect(accountsList).toBeDefined();
  });

  it('should display add account button', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {
        state: mockInitialState,
      },
      mockRoute.params,
    );

    const addButton = screen.getByTestId(
      AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    expect(addButton).toBeDefined();
  });
});
