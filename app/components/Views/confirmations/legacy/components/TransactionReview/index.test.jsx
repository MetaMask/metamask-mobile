import { fireEvent } from '@testing-library/react-native';
import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import TransactionReview from '.';
import { TESTID_ACCORDION_CONTENT } from '../../../../../../component-library/components/Accordions/Accordion/Accordion.constants';
// eslint-disable-next-line import/no-namespace
import * as BlockaidUtils from '../../../../../../util/blockaid';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../../../util/transactions';
import { FALSE_POSITIVE_REPOST_LINE_TEST_ID } from '../BlockaidBanner/BlockaidBanner.constants';
import { MOCK_KEYRING_CONTROLLER_STATE } from '../../../../../../util/test/keyringControllerTestUtils';

jest.mock('../../../../../../util/transactions', () => ({
  ...jest.requireActual('../../../../../../util/transactions'),
  getTransactionReviewActionKey: jest.fn(),
}));

jest.mock('../../../../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  renderAccountName: jest.fn(),
  isQRHardwareAccount: jest.fn(),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

jest.mock(
  '../../../../../UI/QRHardware/withQRHardwareAwareness',
  () => (obj) => obj,
);

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: () => false,
  selectShouldUseSmartTransaction: () => false,
  selectPendingSmartTransactionsBySender: () => [],
  selectPendingSmartTransactionsForSelectedAccountGroup: () => [],
}));

jest.mock('../../../../../../reducers/swaps', () => ({
  swapsStateSelector: () => ({
    featureFlags: {
      smart_transactions: {
        mobile_active: false,
      },
    },
  }),
}));

jest.mock('../../../../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    networkImage: 1,
    networkName: 'Ethereum Main Network',
    networkNativeCurrency: 'ETH',
  })),
}));

const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xB374Ca013934e498e5baD3409147F34E6c462389';
const MOCK_ADDRESS_3 = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState(
  [MOCK_ADDRESS_1, MOCK_ADDRESS_2, MOCK_ADDRESS_3],
  MOCK_ADDRESS_3,
);

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual(
      '../../../../../../util/test/accountsControllerTestUtils',
    );
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');
  return {
    context: {
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
      TransactionController: {
        getNonceLock: jest.fn().mockResolvedValue({
          nextNonce: 1,
          releaseLock: jest.fn(),
        }),
      },
    },
  };
});

jest.mock('@react-navigation/compat', () => {
  const actualNav = jest.requireActual('@react-navigation/compat');
  return {
    actualNav,
    withNavigation: (obj) => obj,
  };
});

jest.mock('react-native-gzip', () => ({
  deflate: (val) => val,
}));

const mockState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: {
              balance: '0x2',
            },
          },
        },
      },
      PreferencesController: {
        securityAlertsEnabled: true,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: MOCK_KEYRING_CONTROLLER_STATE,
    },
  },
  settings: {
    showHexData: true,
    primaryCurrency: 'ETH',
  },
  transaction: {
    transaction: {
      from: MOCK_ADDRESS_1,
      to: MOCK_ADDRESS_2,
    },
    transactionTo: MOCK_ADDRESS_2,
    selectedAsset: {
      isETH: true,
      address: MOCK_ADDRESS_1,
      symbol: 'ETH',
      decimals: 8,
    },
    transactionToName: 'Account 2',
    transactionFromName: 'Account 1',
  },
  fiatOrders: {
    networks: [
      {
        chainId: '1',
        type: 'sepolia',
        nickname: 'Sepolia',
      },
    ],
  },
  alert: { isVisible: false },
};

jest.mock('react-redux', () => {
  const securityAlertResponse = {
    result_type: 'Malicious',
    reason: 'blur_farming',
    providerRequestsCount: {},
    block: 123,
    req: {},
    chainId: '0x1',
  };
  return {
    ...jest.requireActual('react-redux'),
    useSelector: (fn) =>
      fn({
        ...mockState,
        transaction: {
          ...mockState.transaction,
          id: 123,
          securityAlertResponses: {
            123: securityAlertResponse,
          },
        },
      }),
  };
});

const generateTransform = jest.fn();

describe('TransactionReview', () => {
  it('should render correctly', () => {
    const mockStore = configureMockStore();
    const store = mockStore(mockState);
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReview generateTransform={generateTransform} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should match snapshot', () => {
    const container = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      { state: mockState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should display blockaid banner', async () => {
    const securityAlertResponse = {
      result_type: 'Malicious',
      reason: 'blur_farming',
      providerRequestsCount: {},
      block: 123,
      req: {},
      chainId: '0x1',
      features: ['test', 'test'],
    };

    const blockaidMetricsParamsSpy = jest
      .spyOn(BlockaidUtils, 'getBlockaidMetricsParams')
      .mockImplementation(({ result_type, reason, providerRequestsCount }) => ({
        security_alert_response: result_type,
        security_alert_reason: reason,
        security_alert_provider_requests_count: providerRequestsCount,
      }));
    const { queryByText, queryByTestId, getByText } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      {
        state: {
          ...mockState,
          transaction: {
            ...mockState.transaction,
            id: '123',
            securityAlertResponse,
            securityAlertResponses: {
              123: securityAlertResponse,
            },
          },
        },
      },
    );
    expect(await queryByText('See details')).toBeDefined();
    expect(
      await queryByText(
        'If you approve this request, someone can steal your assets listed on Blur.',
      ),
    ).toBeDefined();

    fireEvent.press(await getByText('See details'));

    expect(await queryByTestId(TESTID_ACCORDION_CONTENT)).toBeDefined();
    expect(
      await queryByTestId(FALSE_POSITIVE_REPOST_LINE_TEST_ID),
    ).toBeDefined();
    expect(await queryByText('Something doesn’t look right?')).toBeDefined();
    expect(await queryByText('Report an issue')).toBeDefined();

    fireEvent.press(await getByText('Report an issue'));

    expect(blockaidMetricsParamsSpy).toHaveBeenCalledTimes(1);
    expect(blockaidMetricsParamsSpy).toHaveBeenCalledWith(
      securityAlertResponse,
    );
  });

  it('should have enabled confirm button if from account has balance', async () => {
    jest
      .spyOn(TransactionUtils, 'getTransactionReviewActionKey')
      .mockReturnValue(Promise.resolve(undefined));
    const { queryByRole } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      { state: mockState },
    );
    const confirmButton = await queryByRole('button', { name: 'Confirm' });
    expect(confirmButton.props.disabled).not.toBe(true);
  });

  it('should not have confirm button disabled if from account has no balance and also if there is no error', async () => {
    const mockNewState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountTrackerController: {
            ...mockState.engine.backgroundState.AccountTrackerController,
            accountsByChainId: {
              '0x1': {
                '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
                  balance: '0x0',
                },
              },
            },
          },
        },
      },
    };
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: (fn) => fn(mockNewState),
    }));
    const { getByRole } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      { state: mockState },
    );
    const confirmButton = getByRole('button', { name: 'Confirm' });
    expect(confirmButton.props.disabled).toBe(false);
  });

  it('should have confirm button disabled if error is defined', async () => {
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: (fn) => fn(mockState),
    }));
    const { getByRole } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
        error="You need 1 more ETH to complete the transaction"
      />,
      { state: mockState },
    );
    const confirmButton = getByRole('button', { name: 'Confirm' });
    expect(confirmButton.props.disabled).toBe(true);
  });
});
