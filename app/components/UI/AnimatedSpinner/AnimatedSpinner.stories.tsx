import React from 'react';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedSpinner, { SpinnerSize } from './index';

export default {
  title: 'UI/AnimatedSpinner',
  component: AnimatedSpinner,
  argTypes: {
    size: {
      options: [SpinnerSize.MD, SpinnerSize.SM],
      control: { type: 'select' },
      defaultValue: SpinnerSize.MD,
    },
  },
};

const Template = (args: { size: keyof typeof SpinnerSize }) => (
  <ThemeContext.Provider value={mockTheme}>
    <AnimatedSpinner {...args} />
  </ThemeContext.Provider>
);

Template.args = {
  size: SpinnerSize.MD,
};

export const Default = Template.bind({});
