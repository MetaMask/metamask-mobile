import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AddressList from './';

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          chainId: '1',
        },
      },
      AddressBookController: {
        addressBook: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            chainId: '1',
            isEns: false,
            memo: '',
            name: 'aa',
          },
        },
      },
      PreferencesController: {
        identities: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            name: 'Account 1',
          },
        },
      },
      TransactionController: {
        transactions: [],
      },
    },
  },
};

const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressList onAccountLongPress={() => null} onAccountPress={() => null} />,
    { state },
  );

describe('AddressList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });
});
