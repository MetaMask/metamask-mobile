/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';
import { SAMPLE_ACCORDIONHEADER_PROPS } from './foundation/AccordionHeader/AccordionHeader.constants';
import { AccordionHeaderHorizontalAlignment } from './foundation/AccordionHeader/AccordionHeader.types';

// Internal dependencies.
import { default as AccordionComponent } from './Accordion';
import { AccordionProps } from './Accordion.types';

const AccordionMeta = {
  title: 'Component Library / Accordions',
  component: AccordionComponent,
  argTypes: {
    isExpanded: {
      control: { type: 'boolean' },
    },
    horizontalAlignment: {
      options: Object.values(AccordionHeaderHorizontalAlignment),
      mapping: Object.values(AccordionHeaderHorizontalAlignment),
      control: {
        type: 'select',
        labels: Object.keys(AccordionHeaderHorizontalAlignment),
      },
    },
  },
};
export default AccordionMeta;

export const Accordion = {
  args: SAMPLE_ACCORDIONHEADER_PROPS,
  render: (
    args: JSX.IntrinsicAttributes &
      AccordionProps & { children?: React.ReactNode },
  ) => (
    <AccordionComponent {...args}>
      <View
        style={{
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </AccordionComponent>
  ),
};
