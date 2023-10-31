import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import AddressList from './';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  getLabelTextByAddress: jest.fn(),
}));

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
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
    },
  },
};

const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressList
      onIconPress={() => null}
      onAccountLongPress={() => null}
      onAccountPress={() => null}
    />,
    { state },
  );

describe('AddressList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });
});
