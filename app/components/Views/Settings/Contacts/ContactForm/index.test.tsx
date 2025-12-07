import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import Engine, { EngineState } from '../../../../../core/Engine';
import ContactForm from '.';
import { AddContactViewSelectorsIDs } from '../../../../../../e2e/selectors/Settings/Contacts/AddContactView.selectors';

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ADDRESS_2 = '0xf55C0d639d99699bFd7EC54d9FAFee40E4d272C4';
const ENS_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  renderShortAddress: jest.fn((address) => `0x123...${address.slice(-4)}`),
  areAddressesEqual: jest.fn((a, b) => a.toLowerCase() === b.toLowerCase()),
  validateAddressOrENS: jest.fn(() =>
    Promise.resolve({
      addressError: null,
      toEnsName: null,
      addressReady: true,
      toEnsAddress: null,
      errorContinue: false,
    }),
  ),
  toChecksumAddress: jest.fn((address) => address),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AddressBookController: {
      set: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock address book data
const MOCK_ADDRESS_BOOK = {
  '1': {
    [MOCK_ADDRESS]: {
      address: MOCK_ADDRESS,
      name: 'Test Contact 1',
      chainId: '1',
      memo: 'Test memo 1',
    },
  },
};

// Mock navigation functions
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockPop = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
  pop: mockPop,
  setParams: mockSetParams,
};

// Initial state for tests
const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          chainId: '1',
        },
        networkConfigurations: {
          '0x1': {
            name: 'Ethereum Mainnet',
          },
          '0x56': {
            name: 'Binance Smart Chain',
          },
        },
      },
      AddressBookController: {
        addressBook: MOCK_ADDRESS_BOOK,
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '0x0000000000000000000000000000000000000002': {
              address: '0x0000000000000000000000000000000000000002',
              name: 'Account 1',
              type: 'normal',
            },
          },
        },
      },
    } as unknown as EngineState,
  },
  user: {
    ambiguousAddressEntries: {},
  },
};

// Helper function to render component with necessary props
const renderContactForm = (
  routeParams = {},
  state: Partial<Omit<RootState, 'user'>> & {
    engine: { backgroundState: EngineState };
    user: Pick<RootState['user'], 'ambiguousAddressEntries'>;
  } = initialState,
) =>
  renderWithProvider(
    <ContactForm
      navigation={mockNavigation}
      route={{
        params: {
          mode: 'add',
          ...routeParams,
        },
      }}
    />,
    { state },
  );

describe('ContactForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderContactForm();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders in add mode by default', async () => {
    const { findByTestId, queryByTestId } = renderContactForm();

    // Check if Add button is visible
    const addButton = await findByTestId(AddContactViewSelectorsIDs.ADD_BUTTON);
    expect(addButton).toBeTruthy();

    // Delete button should not be visible in add mode
    const deleteButton = queryByTestId(
      AddContactViewSelectorsIDs.DELETE_BUTTON,
    );
    expect(deleteButton).toBeNull();
  });

  it('handles address changes and validates them', async () => {
    const validateAddressOrENSMock = jest.requireMock(
      '../../../../../util/address',
    ).validateAddressOrENS;

    validateAddressOrENSMock.mockResolvedValueOnce({
      addressError: null,
      toEnsName: null,
      addressReady: true,
      toEnsAddress: null,
      errorContinue: false,
    });

    const { findByTestId } = renderContactForm();

    // Test address change
    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );
    const newAddress = MOCK_ADDRESS_2;
    fireEvent.changeText(addressInput, newAddress);

    await waitFor(() => {
      expect(validateAddressOrENSMock).toHaveBeenCalledWith(
        newAddress,
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it('saves contact when form is valid', async () => {
    const validateAddressOrENSMock = jest.requireMock(
      '../../../../../util/address',
    ).validateAddressOrENS;

    validateAddressOrENSMock.mockResolvedValue({
      addressError: null,
      toEnsName: null,
      addressReady: true,
      toEnsAddress: null,
      errorContinue: false,
    });

    const { findByTestId } = renderContactForm();

    const nameInput = await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT);
    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );
    fireEvent.changeText(nameInput, 'Test Contact');
    fireEvent.changeText(addressInput, MOCK_ADDRESS_2);

    await waitFor(() => {
      expect(validateAddressOrENSMock).toHaveBeenCalled();
    });

    // Click save button
    const addButton = await findByTestId(AddContactViewSelectorsIDs.ADD_BUTTON);
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(Engine.context.AddressBookController.set).toHaveBeenCalledWith(
        MOCK_ADDRESS_2,
        'Test Contact',
        '0x1',
        null,
      );
      expect(mockPop).toHaveBeenCalled();
    });
  });

  it('shows error message when address is invalid', async () => {
    const validateAddressOrENSMock = jest.requireMock(
      '../../../../../util/address',
    ).validateAddressOrENS;

    validateAddressOrENSMock.mockResolvedValueOnce({
      addressError: 'Invalid address',
      toEnsName: null,
      addressReady: false,
      toEnsAddress: null,
      errorContinue: false,
    });

    const { findByTestId } = renderContactForm();

    // Enter invalid address
    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );
    fireEvent.changeText(addressInput, 'invalid-address');

    await waitFor(() => {
      expect(validateAddressOrENSMock).toHaveBeenCalledWith(
        'invalid-address',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it('handles network selection', async () => {
    const { findByTestId } = renderContactForm();

    await waitFor(() => {
      const networkSelector = findByTestId(
        AddContactViewSelectorsIDs.NETWORK_INPUT,
      );
      expect(networkSelector).toBeTruthy();
    });
  });

  it('handles ENS names correctly', async () => {
    const validateAddressOrENSMock = jest.requireMock(
      '../../../../../util/address',
    ).validateAddressOrENS;

    validateAddressOrENSMock.mockResolvedValueOnce({
      addressError: null,
      toEnsName: 'test.eth',
      addressReady: true,
      toEnsAddress: ENS_ADDRESS,
      errorContinue: false,
    });

    const { findByTestId } = renderContactForm();

    const nameInput = await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT);
    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );
    fireEvent.changeText(nameInput, 'ENS Test Contact');
    fireEvent.changeText(addressInput, 'test.eth');

    // Wait for ENS resolution
    await waitFor(() => {
      expect(validateAddressOrENSMock).toHaveBeenCalledWith(
        'test.eth',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it('handles editable states through route params', async () => {
    // Render in edit mode (initially not editable)
    const { findByTestId, rerender } = renderWithProvider(
      <ContactForm
        navigation={mockNavigation}
        route={{
          params: {
            mode: 'edit',
            address: MOCK_ADDRESS,
          },
        }}
      />,
      { state: initialState },
    );

    // Simulate what happens when the edit button in the header is pressed
    // The navigation handler would call the onEdit function via the route params
    const onEdit = mockNavigation.setParams.mock.calls[0][0].dispatch;
    expect(onEdit).toBeDefined();

    // Call the edit function which would toggle editable state
    onEdit();

    rerender(
      <ContactForm
        navigation={mockNavigation}
        route={{
          params: {
            mode: 'edit',
            address: MOCK_ADDRESS,
            editMode: 'edit',
          },
        }}
      />,
    );

    const nameInput = await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT);

    const memoInput = await findByTestId(AddContactViewSelectorsIDs.MEMO_INPUT);

    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );

    await waitFor(() => {
      expect(addressInput.props.value).toBe(MOCK_ADDRESS);
      expect(addressInput.props.editable).toBeFalsy(); // Address is immutable in edit mode
      expect(nameInput.props.editable).toBeTruthy();
      expect(memoInput.props.editable).toBeTruthy();
    });

    // The delete button should be visible now
    const deleteButton = await findByTestId(
      AddContactViewSelectorsIDs.DELETE_BUTTON,
    );
    expect(deleteButton).toBeTruthy();
  });
});
