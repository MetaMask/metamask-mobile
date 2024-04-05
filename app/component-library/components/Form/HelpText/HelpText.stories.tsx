// Internal dependencies.
import { default as HelpTextComponent } from './HelpText';
import { SAMPLE_HELPTEXT_PROPS } from './HelpText.constants';
import { HelpTextSeverity } from './HelpText.types';

const HelpTextMeta = {
  title: 'Component Library / Form',
  component: HelpTextComponent,
  argTypes: {
    severity: {
      options: HelpTextSeverity,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_HELPTEXT_PROPS.severity,
    },
    children: {
      control: {
        type: 'text',
      },
      defaultValue: SAMPLE_HELPTEXT_PROPS.children,
    },
  },
};
export default HelpTextMeta;

export const HelpText = {};
