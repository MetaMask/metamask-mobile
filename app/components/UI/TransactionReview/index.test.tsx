import React from 'react';
import TransactionReview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../util/transactions';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

jest.mock('../QRHardware/withQRHardwareAwareness', () => (obj: any) => obj);

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
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 0x2,
          },
        },
      },
      TokensController: {
        tokens: [],
      },
      TokenListController: {
        tokenList: {},
      },
      PreferencesController: {
        selectedAddress: '0x2',
      },
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
        provider: {
          ticker: 'eth',
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0x': '0.1',
        },
      },
      TokenBalancesController: {},
      AddressBookController: {
        addressBook: {},
      },
    },
  },
  settings: {
    showHexData: true,
    primaryCurrency: 'ETH',
  },
  transaction: {
    transaction: { from: '0x0', to: '0x1' },
    transactionTo: '0x1',
    selectedAsset: { isETH: true, address: '0x0', symbol: 'ETH', decimals: 8 },
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

Engine.init({});
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

  it('should have confirm button disabled if from account has no balance', () => {
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
                balance: 0x0,
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
