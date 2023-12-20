// Internal dependencies.
import { default as SelectHeaderComponent } from './SelectHeader';

const SelectHeaderMeta = {
  title: 'Component Library / Select',
  component: SelectHeaderComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
};
export default SelectHeaderMeta;

export const SelectHeader = {
  args: {
    title: 'test Title',
    description: 'test Description',
  },
};
