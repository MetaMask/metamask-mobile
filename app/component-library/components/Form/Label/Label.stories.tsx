// Internal dependencies.
import { default as LabelComponent } from './Label';
import { SAMPLE_LABEL_TEXT } from './Label.constants';

const LabelMeta = {
  title: 'Component Library / Form',
  component: LabelComponent,
};
export default LabelMeta;

export const Label = {
  args: {
    children: SAMPLE_LABEL_TEXT,
  },
};
