// External dependencies.
import { IconName } from '../../components/Icons/Icon';

// Internal dependencies.
import { default as MainActionButtonComponent } from './MainActionButton';

const MainActionButtonMeta = {
  title: 'Components Temp / Main Action Button',
  component: MainActionButtonComponent,
  argTypes: {
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
    },
    label: {
      control: { type: 'text' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
  },
};
export default MainActionButtonMeta;

export const MainActionButton = {
  args: {
    iconName: IconName.Add,
    label: 'Add',
    isDisabled: false,
  },
};
