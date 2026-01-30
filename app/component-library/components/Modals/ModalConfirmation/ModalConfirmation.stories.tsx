/* eslint-disable react/display-name */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Internal dependencies.
import { default as ModalConfirmationComponent } from './ModalConfirmation';
import { SAMPLE_MODALCONFIRMATION_PROPS } from './ModalConfirmation.constants';

const Stack = createStackNavigator();

const ModalConfirmationMeta = {
  title: 'Component Library / Modals',
  component: ModalConfirmationComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.title,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.description,
    },
    cancelLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.cancelLabel,
    },
    confirmLabel: {
      control: { type: 'text' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.confirmLabel,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_MODALCONFIRMATION_PROPS.route.params.isDanger,
    },
  },
};
export default ModalConfirmationMeta;

export const ModalConfirmation = {
  render: (args: {
    title: string;
    description: string;
    onConfirm?: (() => void) | undefined;
    onCancel?: (() => void) | undefined;
    cancelLabel?: string | undefined;
    confirmLabel?: string | undefined;
    isDanger?: boolean | undefined;
  }) => (
    // Use independent NavigationContainer to provide route params via initialParams
    // The global withNavigation decorator also wraps stories, but we need initialParams
    <NavigationContainer independent>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="ModalConfirmation"
          component={ModalConfirmationComponent}
          initialParams={args}
        />
      </Stack.Navigator>
    </NavigationContainer>
  ),
};
