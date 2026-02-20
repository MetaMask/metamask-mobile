import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Contacts from './';
import { strings } from '../../../../../locales/i18n';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ContactsViewSelectorIDs } from './ContactsView.testIds';

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createStackNavigator();

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
    const { toJSON } = renderScreen(
      Contacts,
      { name: 'ContactsSettings', options: { headerShown: false } },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
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
});
