// Internal dependencies.
import { default as HelpTextComponent } from './HelpText';
import { SAMPLE_HELPTEXT_PROPS } from './HelpText.constants';
import { HelpTextSeverity } from './HelpText.types';

const HelpTextMeta = {
  title: 'Component Library / Form',
  component: HelpTextComponent,
  argTypes: {
    severity: {
      options: Object.values(HelpTextSeverity),
      mapping: Object.values(HelpTextSeverity),
      control: {
        type: 'select',
        labels: Object.keys(HelpTextSeverity),
      },
    },
  },
};
export default HelpTextMeta;

export const HelpText = {
  args: SAMPLE_HELPTEXT_PROPS,
};
