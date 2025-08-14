/* eslint-disable no-console */
import QuickActionButton from './QuickActionButton';

const QuickActionButtonMeta = {
  title: 'Components Temp / QuickActionButtons / QuickActionButton',
  component: QuickActionButton,
  argTypes: {
    children: {
      control: { type: 'text' },
      description: 'The content to display inside the button',
    },
    isDisabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled',
    },
  },
  args: {
    children: '25%',
    onPress: () => console.log('Button pressed'),
  },
};

export default QuickActionButtonMeta;

export const Default = {};
