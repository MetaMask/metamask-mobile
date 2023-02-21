/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean, text } from '@storybook/addon-knobs';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';
import { TEST_ACCORDION_HEADER_TITLE } from './AccordionHeader.constants';

storiesOf('Component Library / AccordionHeader', module).add('Default', () => {
  const groupId = 'Props';
  const titleText = text('title', TEST_ACCORDION_HEADER_TITLE, groupId);
  const isExpanded = boolean('isExpanded', false, groupId);

  return <AccordionHeader title={titleText} isExpanded={isExpanded} />;
});
