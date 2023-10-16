import React from 'react';
import TransactionReview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../util/transactions';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

jest.mock('../../../util/transactions', () => ({
  ...jest.requireActual('../../../util/transactions'),
  getTransactionReviewActionKey: jest.fn(),
}));

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  renderAccountName: jest.fn(),
  isQRHardwareAccount: jest.fn(),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

jest.mock('../QRHardware/withQRHardwareAwareness', () => (obj: any) => obj);

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
  },
}));

jest.mock('@react-navigation/compat', () => {
  const actualNav = jest.requireActual('@react-navigation/compat');
  return {
    actualNav,
    withNavigation: (obj: any) => obj,
  };
});

const mockState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            balance: '0x2',
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0xd018538C87232FF95acbCe4870629b75640a78E7',
        identities: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': { name: 'Account 1' },
          '0x1': { name: 'Account 2' },
          '0x2': { name: 'Account 3' },
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
      },
    },
  },
  settings: {
    showHexData: true,
    primaryCurrency: 'ETH',
  },
  transaction: {
    transaction: {
      from: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      to: '0xB374Ca013934e498e5baD3409147F34E6c462389',
    },
    transactionTo: '0xB374Ca013934e498e5baD3409147F34E6c462389',
    selectedAsset: {
      isETH: true,
      address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      symbol: 'ETH',
      decimals: 8,
    },
    transactionToName: 'Account 2',
    transactionFromName: 'Account 1',
  },
  fiatOrders: {
    networks: [
      {
        chainId: '0xaa36a7',
        type: 'sepolia',
        nickname: 'Sepolia',
      },
    ],
  },
  alert: { isVisible: false },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) => fn(mockState),
}));

const generateTransform = jest.fn();

describe('TransactionReview', () => {
  it('should render correctly', () => {
    const mockStore = configureMockStore();
    const store = mockStore(mockState);
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReview generateTransform={generateTransform as any} />
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
    const { queryByText } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      {
        state: {
          ...mockState,
          transaction: {
            ...mockState.transaction,
            securityAlertResponse: {
              resultType: 'Malicious',
              reason: 'blur_farming',
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

  it('should have confirm button disabled if from account has no balance', async () => {
    const mockNewState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountTrackerController: {
            ...mockState.engine.backgroundState.AccountTrackerController,
            accounts: {
              '0x0': {
                balance: '0x0',
              },
            },
          },
        },
      },
    };
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: (fn: any) => fn(mockNewState),
    }));
    const { getByRole } = renderWithProvider(
      <TransactionReview
        EIP1559GasData={{}}
        generateTransform={generateTransform}
      />,
      { state: mockState },
    );
    const confirmButton = getByRole('button', { name: 'Confirm' });
    expect(confirmButton.props.disabled).toBe(true);
  });
});
