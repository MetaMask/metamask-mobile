import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import AddressList from '.';
import { createMockAccountsControllerState } from '../../../../../../util/test/accountsControllerTestUtils';
import { waitFor } from '@testing-library/react-native';
import { AddressListProps } from './AddressList.types';
import { RootState } from '../../../../../../reducers';
import { EngineState } from '../../../../../../core/Engine';

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xF55C0d639D99699Bfd7Ec54d9FaFEe40e4D272C4';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

// Mock isSmartContractAddress to avoid actual network calls during tests
jest.mock('../../../../../../util/transactions', () => ({
  ...jest.requireActual('../../../../../../util/transactions'),
  isSmartContractAddress: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual(
      '../../../../../../util/test/accountsControllerTestUtils',
    );
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

const textElements = {
  yourAccounts: 'Your Accounts',
  contacts: 'Contacts',
  firstAccount: 'Account 1',
  firstContact: 'My first contact',
  secondContact: 'My second contact',
};

const MOCK_ADDRESS_BOOK = {
  '0x1': {
    [MOCK_ADDRESS]: {
      address: MOCK_ADDRESS,
      chainId: '0x1' as `0x${string}`,
      isEns: false,
      memo: '',
      name: textElements.firstContact,
    },
  },
  '0x5': {
    [MOCK_ADDRESS_2]: {
      address: MOCK_ADDRESS_2,
      chainId: '0x5' as `0x${string}`,
      isEns: false,
      memo: '',
      name: textElements.secondContact,
    },
  },
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AddressBookController: {
        addressBook: MOCK_ADDRESS_BOOK,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  user: {
    ambiguousAddressEntries: {},
  },
};

const renderComponent = (
  state: Partial<Omit<RootState, 'user'>> & {
    engine: { backgroundState: EngineState };
    user: Pick<RootState['user'], 'ambiguousAddressEntries'>;
  },
  props?: Partial<AddressListProps>,
) =>
  renderWithProvider(
    <AddressList
      onIconPress={() => null}
      onAccountLongPress={() => null}
      onAccountPress={() => null}
      chainId="0x1"
      inputSearch=""
      reloadAddressList={false}
      {...props}
    />,
    { state },
  );

describe('AddressList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders both my accounts and address book when onlyRenderAddressBook is false', async () => {
    const { findByText } = renderComponent(initialState);
    await findByText(textElements.firstAccount);
    await findByText(textElements.yourAccounts);
    await findByText(textElements.contacts);
    await findByText(textElements.firstContact);
  });

  it('only renders address book when onlyRenderAddressBook is true', async () => {
    const { queryByText } = renderComponent(initialState, {
      onlyRenderAddressBook: true,
    });

    await waitFor(() => {
      expect(queryByText(textElements.yourAccounts)).toBeNull();
      expect(queryByText(textElements.contacts)).toBeNull();
      expect(queryByText(textElements.firstContact)).toBeTruthy();
    });
  });

  it('shows contacts from all chains when rendering address book', async () => {
    const { queryByText } = renderComponent(initialState, {
      onlyRenderAddressBook: true,
    });

    await waitFor(() => {
      // Both contacts from different chains are visible
      expect(queryByText(textElements.firstContact)).toBeTruthy();
      expect(queryByText(textElements.secondContact)).toBeTruthy();
    });
  });

  it('renders address elements with network badges', async () => {
    const { findAllByTestId } = renderComponent(initialState);

    const addressElements = await findAllByTestId('address-book-account');
    expect(addressElements.length).toBeGreaterThan(0);

    // Verify network badges are present
    const networkBadges = await findAllByTestId('badgenetwork');
    expect(networkBadges.length).toBeGreaterThan(0);
  });
});
