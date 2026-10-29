// Internal dependencies.
import { default as FoxiconComponent } from './Foxicon';
import { FoxiconVariant } from './Foxicon.types';

const FoxiconMeta = {
  title: 'Components Temp / Foxicon',
  component: FoxiconComponent,
  argTypes: {
    variant: {
      options: FoxiconVariant,
      control: {
        type: 'select',
      },
    },
    size: {
      control: { type: 'number' },
    },
  },
  args: {
    variant: FoxiconVariant.Base,
    size: 48,
  },
};
export default FoxiconMeta;

export const Foxicon = {};
