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
    title: {
      control: { type: 'text' },
      defaultValue: SAMPLE_ACCORDIONHEADER_PROPS.title,
    },
    isExpanded: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_ACCORDIONHEADER_PROPS.isExpanded,
    },
    horizontalAlignment: {
      options: AccordionHeaderHorizontalAlignment,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_ACCORDIONHEADER_PROPS.horizontalAlignment,
    },
  },
};
export default AccordionMeta;

export const Accordion = {
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
