// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import ModalContactRequest from './ModalContactRequest';

storiesOf('Component Library / ModalContactRequest', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => <ModalContactRequest />);
