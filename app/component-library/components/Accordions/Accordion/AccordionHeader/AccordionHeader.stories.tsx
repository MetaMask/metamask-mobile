/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';

storiesOf('Component Library / AccordionHeader', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => <AccordionHeader title="Test" />);
