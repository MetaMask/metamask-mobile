/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import { AccordionHeaderProps } from './AccordionHeader/AccordionHeader.types';
import Text, { TextVariant } from '../../Text';

// Internal dependencies.
import Accordion from './Accordion';

storiesOf('Component Library / Accordion', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const accordionHeaderProps: AccordionHeaderProps = {
      title: 'Sample Title',
      onPress: () => console.log("I'm clicked!"),
    };
    return (
      <Accordion accordionHeaderProps={accordionHeaderProps}>
        <View
          style={{
            height: 50,
            backgroundColor: mockTheme.colors.background.alternative,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={TextVariant.sBodySM}>{'Wrapped Content'}</Text>
        </View>
      </Accordion>
    );
  });
