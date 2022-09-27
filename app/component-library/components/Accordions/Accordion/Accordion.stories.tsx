/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean, text } from '@storybook/addon-knobs';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Text';

// Internal dependencies.
import Accordion from './Accordion';
import { TEST_ACCORDION_HEADER_TITLE } from './foundation/AccordionHeader/AccordionHeader.constants';

storiesOf('Component Library / Accordion', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const titleText = text('title', TEST_ACCORDION_HEADER_TITLE, groupId);
    const isExpanded = boolean('isExpanded?', false, groupId);
    return (
      <Accordion title={titleText} isExpanded={isExpanded}>
        <View
          style={{
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
