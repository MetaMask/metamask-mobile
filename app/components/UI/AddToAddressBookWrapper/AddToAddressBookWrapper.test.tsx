import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import AddToAddressBookWrapper from './AddToAddressBookWrapper';
import { AddAddressModalSelectorsIDs } from './AddAddressModal.testIds';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import Engine from '../../../core/Engine';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AddressBookController: {
        addressBook: {
          [MOCK_ADDRESS_2]: {
            [MOCK_ADDRESS_2]: {
              address: MOCK_ADDRESS_2,
              name: 'Account 2',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('AddToAddressBookWrapper', () => {
  beforeAll(() => {
    //@ts-expect-error - This is for test purposes
    Engine.context = {
      AddressBookController: {
        set: jest.fn(),
      },
    };
  });
  it('should match default snapshot', async () => {
    const container = renderWithProvider(
      <AddToAddressBookWrapper address="0x10e08af911f2e48948">
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(container.toJSON()).toMatchSnapshot();
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
      <AddToAddressBookWrapper address={MOCK_ADDRESS_1}>
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
      <AddToAddressBookWrapper address={MOCK_ADDRESS_1} defaultNull>
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );
    expect(queryByText('DUMMY')).toBeNull();
    expect(
      queryByText(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    ).toBeNull();
  });

  it('should save address to address book on confirm', async () => {
    const mockSetToAddressName = jest.fn();
    const { getByTestId, getByText } = renderWithProvider(
      <AddToAddressBookWrapper
        address="0x10e08af911f2e48948"
        setToAddressName={mockSetToAddressName}
      >
        <Text>DUMMY</Text>
      </AddToAddressBookWrapper>,
      { state: initialState },
    );

    fireEvent.press(
      getByTestId(AddAddressModalSelectorsIDs.ADD_ADDRESS_BUTTON),
    );
    expect(getByText('Add to address book')).toBeDefined();

    const aliasInput = getByTestId(
      AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
    );
    fireEvent.changeText(aliasInput, 'New Alias');
    expect(aliasInput.props.value).toBe('New Alias');

    fireEvent.press(getByTestId(AddAddressModalSelectorsIDs.SAVE_BUTTON));

    expect(Engine.context.AddressBookController.set).toHaveBeenCalledWith(
      '0x10e08af911f2e48948',
      'New Alias',
      '0x1',
    );

    expect(mockSetToAddressName).toHaveBeenCalledWith('New Alias');
  });
});
