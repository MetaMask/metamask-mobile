import React from 'react';
// eslint-disable-next-line react-native/split-platform-components
import { ActionSheetIOS, View, Text, Pressable } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Contacts, { Contacts as ContactsView } from './';
import { strings } from '../../../../../locales/i18n';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ContactsViewSelectorIDs } from './ContactsView.testIds';
import Routes from '../../../../constants/navigation/Routes';

const mockDeleteContact = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    AddressBookController: {
      delete: (...args: unknown[]) => mockDeleteContact(...args),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createNativeStackNavigator();

const PLACEHOLDER_SCREEN_TEST_ID = 'contacts-test-placeholder-screen';
const GO_TO_CONTACTS_TEST_ID = 'contacts-test-go-to-contacts';
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const renderContactsComponent = () =>
  renderWithProvider(
    <ContactsView
      addressBook={{}}
      chainId="0x1"
      navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
    />,
    { state: initialState },
  );

function PlaceholderScreen({
  navigation,
}: {
  navigation: { navigate: (name: string) => void };
}) {
  return (
    <View testID={PLACEHOLDER_SCREEN_TEST_ID}>
      <Text>Placeholder</Text>
      <Pressable
        testID={GO_TO_CONTACTS_TEST_ID}
        onPress={() => navigation.navigate('ContactsSettings')}
      >
        <Text>Go to Contacts</Text>
      </Pressable>
    </View>
  );
}

describe('Contacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    const { getByText } = renderScreen(
      Contacts,
      { name: 'ContactsSettings', options: { headerShown: false } },
      { state: initialState },
    );
    expect(getByText(strings('app_settings.contacts_title'))).toBeOnTheScreen();
  });

  it('renders inline header with Contacts title', () => {
    const { getByTestId, getByText } = renderScreen(
      Contacts,
      { name: 'ContactsSettings', options: { headerShown: false } },
      { state: initialState },
    );
    expect(getByTestId(ContactsViewSelectorIDs.HEADER)).toBeOnTheScreen();
    expect(getByText(strings('app_settings.contacts_title'))).toBeOnTheScreen();
  });

  it('navigates back when header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <Stack.Navigator initialRouteName="Placeholder">
        <Stack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ContactsSettings"
          component={Contacts}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>,
      { state: initialState },
    );

    expect(getByTestId(PLACEHOLDER_SCREEN_TEST_ID)).toBeOnTheScreen();
    fireEvent.press(getByTestId(GO_TO_CONTACTS_TEST_ID));

    const backButton = getByTestId(ContactsViewSelectorIDs.HEADER_BACK_BUTTON);
    expect(backButton).toBeOnTheScreen();
    fireEvent.press(backButton);

    expect(getByTestId(PLACEHOLDER_SCREEN_TEST_ID)).toBeOnTheScreen();
  });

  it('opens the selected contact in edit mode', () => {
    const address = '0x0000000000000000000000000000000000000001';
    const { UNSAFE_getByProps } = renderContactsComponent();
    const addressList = UNSAFE_getByProps({ onlyRenderAddressBook: true });

    addressList.props.onAccountPress(address);

    expect(mockNavigate).toHaveBeenCalledWith(
      'ContactForm',
      expect.objectContaining({
        mode: 'edit',
        editMode: 'edit',
        address,
      }),
    );
  });

  it('opens the ambiguous-address sheet from the address list', () => {
    const { UNSAFE_getByProps } = renderContactsComponent();
    const addressList = UNSAFE_getByProps({ onlyRenderAddressBook: true });

    addressList.props.onIconPress();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
  });

  it('does not delete a contact before one is selected', () => {
    const { UNSAFE_getByProps } = renderContactsComponent();
    const actionSheet = UNSAFE_getByProps({
      cancelButtonIndex: 1,
      destructiveButtonIndex: 0,
    });

    act(() => {
      actionSheet.props.onPress(0);
    });

    expect(mockDeleteContact).not.toHaveBeenCalled();
  });

  it('deletes the contact selected by long press', () => {
    const address = '0x0000000000000000000000000000000000000001';
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(() => undefined);
    const { UNSAFE_getByProps } = renderContactsComponent();
    const addressList = UNSAFE_getByProps({ onlyRenderAddressBook: true });
    const actionSheet = UNSAFE_getByProps({
      cancelButtonIndex: 1,
      destructiveButtonIndex: 0,
    });
    jest.useFakeTimers();

    act(() => {
      addressList.props.onAccountLongPress(address);
      actionSheet.props.onPress(0);
      jest.runOnlyPendingTimers();
    });

    expect(mockDeleteContact).toHaveBeenCalledWith('0x1', address);
  });
});
