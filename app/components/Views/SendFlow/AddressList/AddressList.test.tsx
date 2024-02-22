import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import AddressList from './';

jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AddressBookController: {
        addressBook: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
            chainId: '1',
            isEns: false,
            memo: '',
            name: 'aa',
          },
        },
      },
      PreferencesController: {
        identities: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
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
