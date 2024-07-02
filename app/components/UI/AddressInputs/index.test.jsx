import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { AddressFrom, AddressTo } from './index';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { AddAddressModalSelectorsIDs } from '../../../../e2e/selectors/Modals/AddAddressModal.selectors';

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
        identities: {
          '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': {
            address: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
            name: 'Account 1',
          },
          '0x519d2CE57898513F676a5C3b66496c3C394c9CC7': {
            address: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
            name: 'Account 2',
          },
        },
        useTokenDetection: false,
      },
      AddressBookController: {
        addressBook: {
          '0x1': {
            '0x519d2CE57898513F676a5C3b66496c3C394c9CC7': {
              address: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
              name: 'Account 2',
            },
          },
        },
      },
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x9004C7f302475BF5501fbc6254f69C64212A0d12'],
          },
        ],
      },
    },
  },
}));

describe('AddressInputs', () => {
  describe('AddressFrom', () => {
    it('should match default snapshot', async () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x9004C7f302475BF5501fbc6254f69C64212A0d12"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
        />,
        { state: initialState },
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when layout is vertical', () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x9004C7f302475BF5501fbc6254f69C64212A0d12"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
          layout="vertical"
        />,
        { state: initialState },
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('AddressTo', () => {
    it('should match default snapshot', () => {
      const container = renderWithProvider(
        <AddressTo
          displayExclamation
          isConfirmScreen
          toAddressName="DUMMY_ACCOUNT"
          toSelectedAddress="0x9004C7f302475BF5501fbc6254f69C64212A0d12"
        />,
        { state: initialState },
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when layout is vertical', () => {
      const container = renderWithProvider(
        <AddressTo
          displayExclamation
          isConfirmScreen
          toAddressName="DUMMY_ACCOUNT"
          toSelectedAddress="0x9004C7f302475BF5501fbc6254f69C64212A0d12"
          layout="vertical"
        />,
        { state: initialState },
      );
      expect(container).toMatchSnapshot();
    });

    it('should open address book modal on press', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <AddressTo
          displayExclamation
          isConfirmScreen
          toAddressName={undefined}
          toSelectedAddress="0x9004C7f302475BF5501fbc6254f69C64212A0d12"
          layout="vertical"
        />,
        { state: initialState },
      );
      fireEvent.press(
        getByTestId(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
      );
      expect(getByText('Add to address book')).toBeDefined();
    });
  });
});
