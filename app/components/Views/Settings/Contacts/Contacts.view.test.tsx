import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  renderAmbiguousAddressSheet,
  renderContactForm,
  renderContactsWithRoutes,
} from '../../../../../tests/component-view/renderers/identity';
import {
  LOCAL_ONLY_CONTACT,
  SYNCED_CONTACT,
  contactSyncToggleAddressBook,
  syncedContactAddressBook,
} from '../../../../../tests/component-view/presets/identity';
import { strings } from '../../../../../locales/i18n';
import { NETWORK_LIST_BOTTOM_SHEET } from '../../AddAsset/components/NetworkListBottomSheet/NetworkListBottomSheet';
import { AddContactViewSelectorsIDs } from './AddContactView.testIds';
import { ContactsViewSelectorIDs } from './ContactsView.testIds';

describeForPlatforms('Contact syncing component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs users contacts and retrieves them after importing the same SRP', async () => {
    const setContactSpy = jest.spyOn(
      Engine.context.AddressBookController,
      'set',
    );
    const { getByTestId, findByTestId } = renderContactForm();

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT),
      SYNCED_CONTACT.name,
    );
    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      SYNCED_CONTACT.address,
    );

    await waitFor(() => {
      expect(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON)).toBeEnabled();
    });

    fireEvent.press(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON));

    await waitFor(() => {
      expect(setContactSpy).toHaveBeenCalledWith(
        SYNCED_CONTACT.address,
        SYNCED_CONTACT.name,
        SYNCED_CONTACT.chainId,
        null,
      );
    });
    const { findByText } = renderContactsWithRoutes({
      stateOptions: {
        addressBook: syncedContactAddressBook,
      },
    });

    expect(await findByText(SYNCED_CONTACT.name)).toBeOnTheScreen();

    setContactSpy.mockRestore();
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

  it('opens the network selector from the add contact form', async () => {
    const { findByTestId } = renderContactForm();

    fireEvent.press(
      await findByTestId(AddContactViewSelectorsIDs.NETWORK_INPUT),
    );

    expect(await findByTestId(NETWORK_LIST_BOTTOM_SHEET)).toBeOnTheScreen();
  });

  it('renders and dismisses the ambiguous address explanation sheet', () => {
    const { getByText } = renderAmbiguousAddressSheet();

    expect(getByText(strings('duplicate_address.title'))).toBeOnTheScreen();
    expect(getByText(strings('duplicate_address.body'))).toBeOnTheScreen();

    fireEvent.press(getByText(strings('duplicate_address.button')));
  });

  it('shows synced and local-only contacts in the current app state before fresh login', async () => {
    const { findByText } = renderContactsWithRoutes({
      stateOptions: {
        addressBook: contactSyncToggleAddressBook,
      },
    });

    expect(await findByText(SYNCED_CONTACT.name)).toBeOnTheScreen();
    expect(await findByText(LOCAL_ONLY_CONTACT.name)).toBeOnTheScreen();
  });

  it('excludes contacts created while contact sync was disabled from fresh synced state', async () => {
    const { findByText, queryByText } = renderContactsWithRoutes({
      stateOptions: {
        addressBook: syncedContactAddressBook,
      },
    });

    expect(await findByText(SYNCED_CONTACT.name)).toBeOnTheScreen();
    expect(queryByText(LOCAL_ONLY_CONTACT.name)).not.toBeOnTheScreen();
  });
});
