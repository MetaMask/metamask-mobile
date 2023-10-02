// Internal dependencies.
import { default as LabelComponent } from './Label';
import { SAMPLE_LABEL_TEXT } from './Label.constants';

const LabelMeta = {
  title: 'Component Library / Form',
  component: LabelComponent,
  argTypes: {
    children: {
      control: {
        type: 'text',
      },
      defaultValue: SAMPLE_LABEL_TEXT,
    },
  },
};
export default LabelMeta;

export const Label = {};
