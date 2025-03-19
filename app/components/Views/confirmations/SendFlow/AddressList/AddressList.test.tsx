import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import AddressList from '.';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

jest.mock('../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AddressBookController: {
        addressBook: {
          '0x1': {
            [MOCK_ADDRESS]: {
              address: MOCK_ADDRESS,
              chainId: '0x1',
              isEns: false,
              memo: '',
              name: 'aa',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressList
      onIconPress={() => null}
      onAccountLongPress={() => null}
      onAccountPress={() => null}
      chainId="0x1"
      inputSearch=""
      reloadAddressList={false}
    />,
    { state },
  );

describe('AddressList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });
});
