// Internal dependencies.
import { default as AccordionHeaderComponent } from './AccordionHeader';
import { SAMPLE_ACCORDIONHEADER_PROPS } from './AccordionHeader.constants';
import { AccordionHeaderHorizontalAlignment } from './AccordionHeader.types';

const AccordionHeaderMeta = {
  title: 'Component Library / Accordions',
  component: AccordionHeaderComponent,
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
export default AccordionHeaderMeta;

export const AccordionHeader = {};
