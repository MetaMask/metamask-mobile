import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  renderContactForm,
  renderContactsWithRoutes,
} from '../../../../../tests/component-view/renderers/identity';
import {
  LOCAL_ONLY_CONTACT,
  SYNCED_CONTACT,
  syncedContactAddressBook,
} from '../../../../../tests/component-view/presets/identity';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { NETWORK_LIST_BOTTOM_SHEET } from '../../AddAsset/components/NetworkListBottomSheet/NetworkListBottomSheet';
import { toChecksumAddress } from '../../../../util/address';
import { AddContactViewSelectorsIDs } from './AddContactView.testIds';
import { ContactsViewSelectorIDs } from './ContactsView.testIds';

const ENSUtilsModule = jest.requireActual('../../../../util/ENSUtils') as {
  doENSLookup: (
    ensName: string,
    chainId?: string,
  ) => Promise<string | undefined>;
};

const ENS_NAME = 'ibrahim.team.mask.eth';
const ENS_RESOLVED_ADDRESS = '0x1234567890aBCdef1234567890abCDef12345678';
const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';

describeForPlatforms('Contacts component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the add contact form from the contacts list', async () => {
    const { getByTestId, findByTestId } = renderContactsWithRoutes();

    fireEvent.press(getByTestId(ContactsViewSelectorIDs.ADD_BUTTON));

    expect(
      await findByTestId(AddContactViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT),
    ).toBeOnTheScreen();
  });

  it('opens an existing synced contact in edit mode', async () => {
    const { findByText, findByTestId } = renderContactsWithRoutes({
      stateOptions: {
        addressBook: syncedContactAddressBook,
      },
    });

    fireEvent.press(await findByText(SYNCED_CONTACT.name));

    const nameInput = await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT);
    const addressInput = await findByTestId(
      AddContactViewSelectorsIDs.ADDRESS_INPUT,
    );

    await waitFor(() => {
      expect(nameInput).toHaveProp('value', SYNCED_CONTACT.name);
      expect(addressInput).toHaveProp('value', SYNCED_CONTACT.address);
    });
  });

  it('shows the duplicate contact error for an already saved address', async () => {
    const { findByTestId, findByText } = renderContactForm({
      stateOptions: {
        addressBook: syncedContactAddressBook,
      },
    });

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      SYNCED_CONTACT.address,
    );

    expect(
      await findByText(strings('address_book.address_already_saved')),
    ).toBeOnTheScreen();
  });

  it('saves a valid contact through the address book controller', async () => {
    const setContactSpy = jest.spyOn(
      Engine.context.AddressBookController,
      'set',
    );
    const { getByTestId, findByTestId } = renderContactForm();

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT),
      LOCAL_ONLY_CONTACT.name,
    );
    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      LOCAL_ONLY_CONTACT.address,
    );

    await waitFor(() => {
      expect(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON)).toBeEnabled();
    });

    fireEvent.press(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON));

    await waitFor(() => {
      expect(setContactSpy).toHaveBeenCalledWith(
        LOCAL_ONLY_CONTACT.address,
        LOCAL_ONLY_CONTACT.name,
        LOCAL_ONLY_CONTACT.chainId,
        null,
      );
    });

    setContactSpy.mockRestore();
  });

  it('opens the network selector from the add contact form', async () => {
    const { findByTestId } = renderContactForm();

    fireEvent.press(
      await findByTestId(AddContactViewSelectorsIDs.NETWORK_INPUT),
    );

    expect(await findByTestId(NETWORK_LIST_BOTTOM_SHEET)).toBeOnTheScreen();
  });

  // --- Migrated from addressbook-ens.spec.ts ---

  it('shows an error for an invalid address format', async () => {
    const { findByTestId, findByText } = renderContactForm();

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      INVALID_ADDRESS,
    );

    expect(
      await findByText(strings('transaction.invalid_address')),
    ).toBeOnTheScreen();
  });

  it('resolves an ENS name and saves the contact with the resolved address', async () => {
    // Spy on doENSLookup so no live Infura connection is needed.
    const ensLookupSpy = jest
      .spyOn(ENSUtilsModule, 'doENSLookup')
      .mockResolvedValue(ENS_RESOLVED_ADDRESS);

    const setContactSpy = jest.spyOn(
      Engine.context.AddressBookController,
      'set',
    );

    const { findByTestId, getByTestId } = renderContactForm();

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT),
      'Ibrahim',
    );
    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      ENS_NAME,
    );

    // Wait until the debounced ENS lookup resolves and the add button becomes enabled.
    await waitFor(() => {
      expect(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON)).toBeEnabled();
    });

    fireEvent.press(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON));

    await waitFor(() => {
      // The controller must be called with the resolved ETH address, not the ENS name.
      expect(setContactSpy).toHaveBeenCalledWith(
        toChecksumAddress(ENS_RESOLVED_ADDRESS),
        'Ibrahim',
        expect.any(String), // chainId
        null,
      );
    });

    ensLookupSpy.mockRestore();
    setContactSpy.mockRestore();
  });

  it('shows a "could not resolve ENS" error when ENS lookup returns nothing', async () => {
    const ensLookupSpy = jest
      .spyOn(ENSUtilsModule, 'doENSLookup')
      .mockResolvedValue(undefined);

    const { findByTestId, findByText } = renderContactForm();

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      ENS_NAME,
    );

    expect(
      await findByText(strings('transaction.could_not_resolve_ens')),
    ).toBeOnTheScreen();

    ensLookupSpy.mockRestore();
  });

  // --- Migrated from addressbook-send-add-contact.spec.ts ---

  it('deletes a contact through the address book controller', async () => {
    const deleteContactSpy = jest.spyOn(
      Engine.context.AddressBookController,
      'delete',
    );
    const onDeleteCallback = jest.fn();

    const { findByTestId, getByTestId } = renderContactForm({
      stateOptions: {
        addressBook: syncedContactAddressBook,
      },
      routeParams: {
        mode: 'edit',
        address: SYNCED_CONTACT.address,
        name: SYNCED_CONTACT.name,
        chainId: SYNCED_CONTACT.chainId,
        onDelete: onDeleteCallback,
      },
    });

    // Edit mode opens read-only; tap Edit to enable save/delete actions (matches E2E).
    fireEvent.press(await findByTestId(AddContactViewSelectorsIDs.EDIT_BUTTON));

    const deleteButton = await findByTestId(
      AddContactViewSelectorsIDs.DELETE_BUTTON,
    );
    expect(deleteButton).toBeOnTheScreen();

    fireEvent.press(deleteButton);

    // Delete opens a confirmation action sheet before calling the controller.
    await waitFor(() => {
      expect(
        getByTestId(
          AddContactViewSelectorsIDs.DELETE_CONFIRM_ACTION_SHEET_OPTION,
        ),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      getByTestId(
        AddContactViewSelectorsIDs.DELETE_CONFIRM_ACTION_SHEET_OPTION,
      ),
    );

    await waitFor(() => {
      expect(deleteContactSpy).toHaveBeenCalledWith(
        SYNCED_CONTACT.chainId,
        expect.stringContaining(SYNCED_CONTACT.address.slice(2).toLowerCase()),
      );
      expect(onDeleteCallback).toHaveBeenCalled();
    });

    deleteContactSpy.mockRestore();
  });
});
