/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';

// Internal dependencies.
import ModalMandatory from './ModalMandatory';
import { ModalMandatoryI } from './ModalMandatory.types';
import Text from '../../Texts/Text';

storiesOf('Component Library / ModalMandatory', module).add('Default', () => (
  <ModalMandatory
    confirmDisabled
    buttonText={'Confirm'}
    headerTitle={'Title'}
    footerHelpText={'Help text'}
    onConfirm={() => {}}
  >
    <Text>Lorem ispum</Text>
  </ModalMandatory>
));
