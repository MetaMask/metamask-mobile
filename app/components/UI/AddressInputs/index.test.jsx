import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AddressFrom, AddressTo } from './index';

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
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
      AddressBookController: {
        addressBook: {
          1: {
            '0x1': {
              address: '0x1',
              name: 'Account 2',
            },
          },
        },
      },
    },
  },
};

describe('AddressInputs', () => {
  describe('AddressFrom', () => {
    it('should match default snapshot', async () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x10e08af911f2e48948"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
        />,
        {},
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when layout is vertical', () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x10e08af911f2e48948"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
          layout="vertical"
        />,
        {},
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
          toSelectedAddress="0x10e08af911f2e48948"
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
          toSelectedAddress="0x10e08af911f2e48948"
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
          toSelectedAddress="0x10e08af911f2e48948"
          layout="vertical"
        />,
        { state: initialState },
      );
      fireEvent.press(getByTestId('add-address-button'));
      expect(getByText('Add to address book')).toBeDefined();
    });
  });
});
