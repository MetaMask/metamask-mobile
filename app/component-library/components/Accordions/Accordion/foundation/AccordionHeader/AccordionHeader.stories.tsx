// Internal dependencies.
import { default as AccordionHeaderComponent } from './AccordionHeader';
import { SAMPLE_ACCORDIONHEADER_PROPS } from './AccordionHeader.constants';
import { AccordionHeaderHorizontalAlignment } from './AccordionHeader.types';

const AccordionHeaderMeta = {
  title: 'Component Library / Accordions',
  component: AccordionHeaderComponent,
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
export default AccordionHeaderMeta;

export const AccordionHeader = {
  args: SAMPLE_ACCORDIONHEADER_PROPS,
};
