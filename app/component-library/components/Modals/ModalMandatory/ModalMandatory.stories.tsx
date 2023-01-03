/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import ModalMandatory from './ModalMandatory';
import Text from '../../Texts/Text';

storiesOf('Component Library / ModalMandatory', module).add('Default', () => (
  <ModalMandatory
    buttonDisabled
    buttonText={'Confirm'}
    headerTitle={'Title'}
    footerHelpText={'Help text'}
    onPress={() => undefined}
  >
    <Text>Lorem ispum</Text>
  </ModalMandatory>
));
