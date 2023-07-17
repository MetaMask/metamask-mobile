/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';
import {
  getAccordionHeaderStoryProps,
  AccordionHeaderStory,
} from './foundation/AccordionHeader/AccordionHeader.stories';

// Internal dependencies.
import Accordion from './Accordion';
import { AccordionProps } from './Accordion.types';

export const getAccordionStoryProps = (): AccordionProps => ({
  ...getAccordionHeaderStoryProps(),
  children: (
    <View
      style={{
        backgroundColor: mockTheme.colors.background.alternative,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
    </View>
  ),
});

const AccordionStory = () => <Accordion {...getAccordionStoryProps()} />;

storiesOf('Component Library / Accordions', module)
  .add('Accordion', AccordionStory)
  .add('foundation / AccordionHeader', AccordionHeaderStory);

export default AccordionStory;
