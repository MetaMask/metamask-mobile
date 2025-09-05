import { fireEvent, waitFor } from '@testing-library/react-native';
import { cloneDeep } from 'lodash';
import ApproveTransactionModal from '.';
import { getTokenDetails } from '../../../../../../util/address';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { SET_APPROVAL_FOR_ALL_SIGNATURE } from '../../../../../../util/transactions';

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  getTokenDetails: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/smartTransactionsController',
  ),
  selectShouldUseSmartTransaction: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE } = jest.requireActual(
    '../../../../../../util/test/accountsControllerTestUtils',
  );
  return {
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
      },
      AssetsContractController: {
        getERC20BalanceOf: jest.fn().mockResolvedValue(0x0186a0),
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        state: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  };
});

const data = `0x${SET_APPROVAL_FOR_ALL_SIGNATURE}00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001`;
const transaction = {
  to: '0x',
  origin: 'test-dapp',
  chainId: '0x1',
  txParams: {
    to: '0x',
    from: '0x',
    data,
    origin: 'test-dapp',
  },
  data,
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TokensController: {
        tokens: [],
        allTokens: {
          '0x1': {
            '0xAddress1': [],
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: '0xAddress1',
          accounts: {
            '0xAddress1': {
              address: '0xAddress1',
            },
          },
        },
      },
    },
  },
  transaction,
  settings: {
    primaryCurrency: 'fiat',
  },
  browser: {
    activeTab: 1605778647042,
    tabs: [{ id: 1605778647042, url: 'https://metamask.github.io/test-dapp/' }],
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
        nativeTokenSupported: true,
      },
    ],
  },
};

describe('ApproveTransactionModal', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      ApproveTransactionModal,
      { name: 'Approve' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('Approve button is enabled when standard is defined', async () => {
    const mockGetTokenDetails = getTokenDetails;
    mockGetTokenDetails.mockReturnValue({
      standard: 'ERC20',
    });
    const state = cloneDeep(initialState);
    state.engine.backgroundState.AccountTrackerController.accounts = [];
    state.engine.backgroundState.TokenListController = {
      tokensChainsCache: {
        '0x1': {
          data: [
            {
              '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
                address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
                symbol: 'SNX',
                decimals: 18,
                name: 'Synthetix Network Token',
                iconUrl:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
                type: 'erc20',
                aggregators: ['Aave'],
                occurrences: 10,
                fees: {
                  '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
                  '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
                },
              },
            },
          ],
        },
      },
    };

    state.transaction = {
      to: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
      origin: 'test-dapp',
      chainId: '0x1',
      txParams: {
        to: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        from: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        data,
        origin: 'test-dapp',
      },
      data,
    };
    const mockOnConfirm = jest.fn();
    const { getByTestId } = renderScreen(
      () => (
        // eslint-disable-next-line react/react-in-jsx-scope
        <ApproveTransactionModal onConfirm={mockOnConfirm} />
      ),
      { name: 'Approve' },
      { state },
    );

    expect(mockGetTokenDetails).toHaveBeenCalled();
    fireEvent.press(getByTestId('Confirm'));
    expect(mockOnConfirm).toHaveBeenCalled();

    await waitFor(() => {
      const isDisabled = getByTestId('Confirm').props.disabled;
      expect(isDisabled).toBe(false);
    });
  });

  it('Approve button is disabled when standard is undefined', async () => {
    const mockGetTokenDetails = getTokenDetails;
    mockGetTokenDetails.mockReturnValue({});
    const state = cloneDeep(initialState);
    state.engine.backgroundState.AccountTrackerController.accounts = [];
    state.engine.backgroundState.TokenListController = {
      tokensChainsCache: {
        '0x1': {
          data: [
            {
              '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
                address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
                symbol: 'SNX',
                decimals: 18,
                name: 'Synthetix Network Token',
                iconUrl:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
                type: 'erc20',
                aggregators: ['Aave'],
                occurrences: 10,
                fees: {
                  '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
                  '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
                },
              },
            },
          ],
        },
      },
    };

    state.transaction = {
      to: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
      origin: 'test-dapp',
      chainId: '0x1',
      txParams: {
        to: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        from: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        data,
        origin: 'test-dapp',
      },
      data,
    };
    const mockOnConfirm = jest.fn();
    const { getByTestId } = renderScreen(
      () => (
        // eslint-disable-next-line react/react-in-jsx-scope
        <ApproveTransactionModal onConfirm={mockOnConfirm} />
      ),
      { name: 'Approve' },
      { state },
    );

    expect(mockGetTokenDetails).toHaveBeenCalled();
    await waitFor(() => {
      const isDisabled = getByTestId('Confirm').props.disabled;
      expect(isDisabled).toBe(true);
    });
  });
});
