import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ApproveTransactionHeader from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

Engine.init();
const mockStore = configureMockStore();
const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
          '0x1': {
            balance: 200,
          },
        },
      },
      TokensController: {
        tokens: [],
      },
      TokenListController: {
        tokenList: {},
      },
      TokenBalancesController: {},
      PermissionController: {
        subjects: {
          'metamask.github.io': {
            origin: 'metamask.github.io',
            permissions: {
              eth_accounts: {
                invoker: 'metamask.github.io',
                caveats: [
                  {
                    type: 'restrictReturnedAccounts',
                    value: [{ address: '0x0' }],
                  },
                ],
              },
            },
          },
        },
      },

      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
          '0x1': {
            address: '0x1',
            name: 'Account 2',
          },
        },
      },
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'usd',
      },
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
          type: 'ropsten',
          nickname: 'Ropsten',
        },

        provider: {
          ticker: 'eth',
        },
      },
      AddressBookController: {
        addressBook: {},
      },
    },
  },
};
const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));
describe('ApproveTransactionHeader', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <Provider store={store}>
        <ApproveTransactionHeader
          origin="metamask.github.io"
          from="0x0"
          url="metamask.github.io"
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with domain title', async () => {
    const { findByText } = renderWithProvider(
      <ApproveTransactionHeader
        from="0x0"
        origin="metamask.github.io"
        url="metamask.github.io"
      />,
      { state: initialState },
    );
    expect(await findByText('metamask.github.io')).toBeDefined();
  });
});
