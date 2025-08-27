import React from 'react';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { ENSCache } from '../../../util/ENSUtils';
import { Transaction } from './AccountFromToInfoCard.types';
import AccountFromToInfoCard from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { AssetsContractController } from '@metamask/assets-controllers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../../util/test/keyringControllerTestUtils';

const MOCK_ADDRESS_1 = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_ADDRESS_2 = '0x519d2CE57898513F676a5C3b66496c3C394c9CC7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const NETWORK_NAME_MOCK = 'Ethereum Main Network';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS_1]: {
              balance: '200',
            },
            [MOCK_ADDRESS_2]: {
              balance: '200',
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': {
            '0x5': {
              '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x2b46',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        vault: 'mock-vault',
        ...MOCK_KEYRING_CONTROLLER_STATE,
        isUnlocked: true,
      },
    },
  },
};

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isQRHardwareAccount: () => false,
}));
const mockGetERC20BalanceOf = jest.fn().mockReturnValue(0x0186a0);

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');

  return {
    context: {
      TokensController: {
        addToken: () => undefined,
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: [
                '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
                '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
                '0x07Be9763a718C0539017E2Ab6fC42853b4aEeb6B',
              ],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
      AssetsContractController: {
        getERC20BalanceOf: mockGetERC20BalanceOf,
      } as Partial<AssetsContractController> as AssetsContractController,
    },
  };
});

jest.mock('../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    networkImage: 10,
    networkName: NETWORK_NAME_MOCK,
    networkNativeCurrency: 'ETH',
  })),
}));

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),

  useSelector: (fn: (arg: DeepPartial<RootState>) => void) =>
    fn(mockInitialState),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

const transactionState: Transaction = {
  transaction: {
    from: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
    to: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
  },
  transactionTo: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
  selectedAsset: { isETH: true, address: '0x0', symbol: 'ETH', decimals: 8 },
  transactionToName: 'Account 2',
  transactionFromName: 'Account 1',
};

describe('AccountFromToInfoCard', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        {/* @ts-expect-error: Rest props are ignored for testing purposes */}
        <AccountFromToInfoCard transactionState={transactionState} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should match snapshot', async () => {
    const container = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should render to account name', async () => {
    const { findByText } = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(await findByText('Account 2')).toBeDefined();
  });

  it('should render to address', async () => {
    const { findByText } = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(await findByText('0x519d2...c9CC7')).toBeDefined();
  });

  it('should render correct to address for NFT send', async () => {
    const NFTTransaction = {
      assetType: 'ERC721',
      selectedAsset: {
        address: '0x26D6C3e7aEFCE970fe3BE5d589DbAbFD30026924',
        standard: 'ERC721',
        tokenId: '13764',
      },
      transaction: {
        data: '0x23b872dd00000000000000000000000007be9763a718c0539017e2ab6fc42853b4aeeb6b000000000000000000000000f4e8263979a89dc357d7f9f79533febc7f3e287b00000000000000000000000000000000000000000000000000000000000035c4',
        from: '0x07Be9763a718C0539017E2Ab6fC42853b4aEeb6B',
        gas: '00',
        to: '0x26D6C3e7aEFCE970fe3BE5d589DbAbFD30026924',
        value: '0x0',
      },
      transactionFromName: 'Account 3',
      transactionTo: '0xF4e8263979A89Dc357d7f9F79533Febc7f3e287B',
      transactionToName: '0xF4e8263979A89Dc357d7f9F79533Febc7f3e287B',
    };
    const { findByText } = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={NFTTransaction} />,
      { state: mockInitialState },
    );
    expect(await findByText('0xF4e82...e287B')).toBeDefined();
  });

  it('should display ens name', async () => {
    const txState: Transaction = {
      ...transactionState,
      transaction: {
        from: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
        to: '0x9004C7f302475BF5501fbc6254f69C64212A0d12',
      },
      transactionTo: '0x9004C7f302475BF5501fbc6254f69C64212A0d12',
    };
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ENSCache.cache as any) = {
      '10x1': {
        name: 'test1.eth',
        timestamp: new Date().getTime(),
      },
      '10x3': {
        name: 'test3.eth',
        timestamp: new Date().getTime(),
      },
    };
    const { queryByText } = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={txState} />,
      { state: mockInitialState },
    );
    expect(await queryByText('test1.eth')).toBeDefined();
    expect(await queryByText('test3.eth')).toBeDefined();
  });

  it('renders correct network name', async () => {
    const { findByText } = renderWithProvider(
      //@ts-expect-error - Rest props are ignored for testing purposes
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(await findByText(NETWORK_NAME_MOCK)).toBeDefined();
  });
});
