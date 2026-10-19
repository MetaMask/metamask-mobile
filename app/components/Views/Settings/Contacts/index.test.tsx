import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Contacts from './';
import { strings } from '../../../../../locales/i18n';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  ContactsViewSelectorIDs,
  ContactsViewSelectorsText,
} from './ContactsView.testIds';

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createNativeStackNavigator();

const PLACEHOLDER_SCREEN_TEST_ID = 'contacts-test-placeholder-screen';
const GO_TO_CONTACTS_TEST_ID = 'contacts-test-go-to-contacts';

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

  it('renders the empty state when the address book has no contacts', () => {
    const { getByTestId, getByText } = renderScreen(
      Contacts,
      { name: 'ContactsSettings', options: { headerShown: false } },
      { state: initialState },
    );

    expect(getByTestId(ContactsViewSelectorIDs.EMPTY_STATE)).toBeOnTheScreen();
    expect(getByText(strings('address_book.no_contacts'))).toBeOnTheScreen();
    expect(
      getByText(strings('address_book.no_contacts_desc')),
    ).toBeOnTheScreen();
  });

  it('hides the empty state when the address book has contacts', () => {
    const { queryByTestId } = renderScreen(
      Contacts,
      { name: 'ContactsSettings', options: { headerShown: false } },
      {
        state: {
          ...initialState,
          engine: {
            backgroundState: {
              ...backgroundState,
              AddressBookController: {
                addressBook: {
                  '0x1': {
                    '0x0000000000000000000000000000000000000001': {
                      address: '0x0000000000000000000000000000000000000001',
                      chainId: '0x1',
                      isEns: false,
                      memo: '',
                      name: ContactsViewSelectorsText.MYTH_CONTACT,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(
      queryByTestId(ContactsViewSelectorIDs.EMPTY_STATE),
    ).not.toBeOnTheScreen();
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
});
