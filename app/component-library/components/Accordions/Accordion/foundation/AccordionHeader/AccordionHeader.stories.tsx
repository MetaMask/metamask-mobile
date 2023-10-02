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
    },
    horizontalAlignment: {
      options: AccordionHeaderHorizontalAlignment,
      control: {
        type: 'select',
      },
    },
  },
};
export default AccordionHeaderMeta;

export const AccordionHeader = {};
