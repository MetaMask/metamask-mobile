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
  contactSyncToggleAddressBook,
  syncedContactAddressBook,
} from '../../../../../tests/component-view/presets/identity';
import { AddContactViewSelectorsIDs } from './AddContactView.testIds';

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
      fireEvent.press(getByTestId(AddContactViewSelectorsIDs.ADD_BUTTON));
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
