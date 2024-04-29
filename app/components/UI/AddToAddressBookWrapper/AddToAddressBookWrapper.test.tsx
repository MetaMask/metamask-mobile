import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import AddToAddressBookWrapper from './AddToAddressBookWrapper';
import { AddAddressModalSelectorsIDs } from '../../../../e2e/selectors/Modals/AddAddressModal.selectors';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
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
          '0x1': {
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

describe('AddToAddressBookWrapper', () => {
  it('should match default snapshot', async () => {
    const container = renderWithProvider(
      <AddToAddressBookWrapper address="0x10e08af911f2e48948">
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(container).toMatchSnapshot();
  });
  it('should open addressbook for new address', async () => {
    const { queryByText, getByTestId, getByText } = renderWithProvider(
      <AddToAddressBookWrapper address="0x10e08af911f2e48948">
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(
      queryByText(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    ).toBeDefined();
    fireEvent.press(
      getByTestId(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    );
    expect(getByText('Add to address book')).toBeDefined();
  });
  it('should not render touchable wrapper if address is already saved', async () => {
    const { queryByText } = renderWithProvider(
      <AddToAddressBookWrapper address="0x0">
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(queryByText('DUMMY')).toBeDefined();
    expect(
      queryByText(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    ).toBeNull();
  });
  it('should return null if address is already saved and defaultNull is true', async () => {
    const { queryByText } = renderWithProvider(
      <AddToAddressBookWrapper address="0x0" defaultNull>
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(queryByText('DUMMY')).toBeNull();
    expect(
      queryByText(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    ).toBeNull();
  });
});
