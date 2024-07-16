import React from 'react';
import { Provider } from 'react-redux';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import PropTypes from 'prop-types';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { ENSCache } from '../../../util/ENSUtils';
import { Transaction } from './AccountFromToInfoCard.types';
import AccountFromToInfoCard from '.';
import Engine from '../../../core/Engine';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';

const MOCK_ADDRESS_1 = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_ADDRESS_2 = '0x519d2CE57898513F676a5C3b66496c3C394c9CC7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '200',
          },
          [MOCK_ADDRESS_2]: {
            balance: '200',
          },
        },
      },
      TokenBalancesController: {
        contractBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isQRHardwareAccount: () => false,
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: () => undefined,
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: [
              '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
              '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
              '0x07Be9763a718C0539017E2Ab6fC42853b4aEeb6B',
            ],
          },
        ],
      },
    },
    AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
  },
}));

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn().mockImplementation((address) => {
    if (address === '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A') {
      return Promise.resolve('test1.eth');
    } else if (address === '0x9004C7f302475BF5501fbc6254f69C64212A0d12') {
      return Promise.resolve('test3.eth');
    }
    return Promise.resolve(null);
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
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
  const AccountFromToInfoCardWithProps = ({
    transactionStateProps,
  }: {
    transactionStateProps: Transaction;
  }) => <AccountFromToInfoCard transactionState={transactionStateProps} />;

  AccountFromToInfoCardWithProps.propTypes = {
    transactionStateProps: PropTypes.object.isRequired,
  };

  AccountFromToInfoCardWithProps.displayName = 'AccountFromToInfoCardWithProps';

  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AccountFromToInfoCardWithProps
          transactionStateProps={transactionState}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match snapshot', () => {
    const { toJSON } = renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render from address', async () => {
    renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(screen.getByText('Account 1')).toBeTruthy();
  });

  it('should render balance of from address', async () => {
    renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(screen.getByText('Balance: < 0.00001 ETH')).toBeTruthy();
  });

  it('should render to account name', async () => {
    renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(screen.getByText('Account 2')).toBeTruthy();
  });

  it('should render to address', async () => {
    renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: mockInitialState },
    );
    expect(screen.getByText('0x519d...9CC7')).toBeTruthy();
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
    render(
      <AccountFromToInfoCard
        transactionState={NFTTransaction as unknown as Transaction}
      />,
      {
        wrapper: ({ children }: { children: React.ReactNode }) => {
          const Wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
          );
          Wrapper.displayName = 'TestWrapper';
          return <Wrapper>{children}</Wrapper>;
        },
      },
    );
    expect(screen.getByText('0xF4e8...287B')).toBeTruthy();
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
      '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': {
        name: 'test1.eth',
        timestamp: new Date().getTime(),
      },
      '0x9004C7f302475BF5501fbc6254f69C64212A0d12': {
        name: 'test3.eth',
        timestamp: new Date().getTime(),
      },
    };

    await act(async () => {
      renderWithProvider(
        <AccountFromToInfoCard
          transactionState={txState}
          onPressFromAddressIcon={jest.fn()}
        />,
        { state: mockInitialState },
      );
    });

    await waitFor(
      async () => {
        await expect(screen.findByText('test1.eth')).resolves.toBeTruthy();
        await expect(screen.findByText('test3.eth')).resolves.toBeTruthy();
      },
      { timeout: 10000 },
    );
  }, 15000);

  it('should correctly mock doENSReverseLookup', async () => {
    const { doENSReverseLookup } = await import('../../../util/ENSUtils');

    const result1 = await doENSReverseLookup(
      '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
    );
    expect(result1).toBe('test1.eth');

    const result2 = await doENSReverseLookup(
      '0x9004C7f302475BF5501fbc6254f69C64212A0d12',
    );
    expect(result2).toBe('test3.eth');

    const result3 = await doENSReverseLookup(
      '0x1234567890123456789012345678901234567890',
    );
    expect(result3).toBeNull();
  });

  describe('from account balance', () => {
    const ERC20Transaction = {
      assetType: 'ERC20',
      data: '0xa9059cbb0000000000000000000000002f318c334780961fb129d2a6c30d0763d9a5c9700000000000000000000000000000000000000000000000000000000000003a98',
      from: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
      selectedAsset: {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
        decimals: '4',
        image: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
        isERC721: false,
        symbol: 'TST',
      },
      to: '0x2f318c334780961fb129d2a6c30d0763d9a5c970',
      transaction: {
        data: '0xa9059cbb0000000000000000000000002f318c334780961fb129d2a6c30d0763d9a5c9700000000000000000000000000000000000000000000000000000000000003a98',
        from: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
        to: '0x2f318c334780961fb129d2a6c30d0763d9a5c970',
        value: '3a98',
      },
    };
    let mockGetERC20BalanceOf: jest.Mock;
    beforeEach(() => {
      jest.useFakeTimers();
      mockGetERC20BalanceOf = jest.fn().mockReturnValue(0x0186a0);
      Engine.context.AssetsContractController = {
        getERC20BalanceOf: mockGetERC20BalanceOf,
        name: 'AssetsContractController',
        getNetworkClientById: jest.fn(),
        provider: {
          sendAsync: jest.fn(),
          send: jest.fn(),
          emit: jest.fn(),
        },
        getProvider: jest.fn(),
      } as unknown as typeof Engine.context.AssetsContractController;
    });

    it('should render balance from AssetsContractController.getERC20BalanceOf if selectedAddress is different from fromAddress', async () => {
      renderWithProvider(
        <AccountFromToInfoCard
          transactionState={ERC20Transaction as unknown as Transaction}
        />,
        { state: mockInitialState },
      );
      screen.debug();
      expect(mockGetERC20BalanceOf).toBeCalledTimes(1);
      await expect(screen.findByText(/Balance:.+TST/)).resolves.toBeTruthy();
    });

    it('should render balance from TokenBalancesController.contractBalances if selectedAddress is same as fromAddress', async () => {
      const transaction = {
        ...ERC20Transaction,
        from: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
        transaction: {
          ...ERC20Transaction.transaction,
          from: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
        },
      };
      renderWithProvider(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <AccountFromToInfoCard transactionState={transaction as any} />,
        { state: mockInitialState },
      );
      expect(mockGetERC20BalanceOf).toBeCalledTimes(0);
      expect(screen.getByText('Balance: 0.0005 TST')).toBeTruthy();
    });
  });
});
