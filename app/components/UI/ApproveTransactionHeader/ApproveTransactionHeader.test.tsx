import React from 'react';
import ApproveTransactionHeader from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

Engine.init();

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
          'http://metamask.github.io': {
            origin: 'http://metamask.github.io',
            permissions: {
              eth_accounts: {
                invoker: 'http://metamask.github.io',
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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

describe('ApproveTransactionHeader', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <ApproveTransactionHeader
        from="0x0"
        origin="http://metamask.github.io"
        url="http://metamask.github.io"
      />,
      { state: initialState },
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with domain title', () => {
    const { getByText } = renderWithProvider(
      <ApproveTransactionHeader
        from="0x0"
        origin="http://metamask.github.io"
        url="http://metamask.github.io"
      />,
      { state: initialState },
    );
    expect(getByText('http://metamask.github.io')).toBeDefined();
  });
});
