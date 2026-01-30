/* eslint-disable react/display-name */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Internal dependencies.
import { default as ModalMandatoryComponent } from './ModalMandatory';
import { SAMPLE_MODALMANDATORY_PROPS } from './ModalMandatory.constants';

const Stack = createStackNavigator();

const ModalMandatoryMeta = {
  title: 'Component Library / Modals',
  component: ModalMandatoryComponent,
  argTypes: {
    headerTitle: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.headerTitle,
    },
    footerHelpText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.footerHelpText,
    },
    buttonText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.buttonText,
    },
    checkboxText: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALMANDATORY_PROPS.route.params.checkboxText,
    },
  },
};
export default ModalMandatoryMeta;

export const ModalMandatory = {
  render: (args: {
    headerTitle: string;
    footerHelpText: string;

    buttonText: string;
    checkboxText: string;
  }) => (
    // Use independent NavigationContainer to provide route params via initialParams
    // The global withNavigation decorator also wraps stories, but we need initialParams
    <NavigationContainer independent>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="ModalMandatory"
          component={ModalMandatoryComponent}
          initialParams={{
            body: SAMPLE_MODALMANDATORY_PROPS.route.params.body,
            onAccept: SAMPLE_MODALMANDATORY_PROPS.route.params.onAccept,
            onRender: SAMPLE_MODALMANDATORY_PROPS.route.params.onRender,
            ...args,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  ),
};
