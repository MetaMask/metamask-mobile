// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { IconName } from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';
import { mockTheme } from '../../../util/theme';

// Internal dependencies.
import { default as SettingsDrawerComponent } from './';
import { SettingsDrawerProps } from './index.types';

const SettingsDrawerMeta = {
  title: 'Settings / Settings Drawers',
  component: SettingsDrawerComponent,
  argTypes: {
    title: {
      control: { type: 'text' },
      defaultValue: 'Settings Option',
    },
    description: {
      control: { type: 'text' },
      defaultValue: 'This is a description of the settings option',
    },
    warning: {
      control: { type: 'text' },
    },
    iconName: {
      options: Object.values(IconName),
      control: {
        type: 'select',
      },
    },
    iconColor: {
      control: { type: 'color' },
    },
    renderArrowRight: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    isFirst: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    isLast: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    titleColor: {
      options: Object.values(TextColor),
      control: {
        type: 'select',
      },
      defaultValue: TextColor.Default,
    },
  },
  decorators: [
    (Story: any) => (
      <View
        style={{
          backgroundColor: mockTheme.colors.background.default,
          padding: 16,
        }}
      >
        <Story />
      </View>
    ),
  ],
};

export default SettingsDrawerMeta;

export const SettingsDrawer = {
  render: (
    args: JSX.IntrinsicAttributes &
      SettingsDrawerProps & { children?: React.ReactNode },
  ) => <SettingsDrawerComponent {...args} onPress={() => alert('Pressed!')} />,
};

// Variant Stories
export const WithWarning = {
  ...SettingsDrawer,
  args: {
    title: 'Settings with Warning',
    description: 'This setting needs attention',
    warning: 'Important warning message',
  },
};

export const WithIcon = {
  ...SettingsDrawer,
  args: {
    title: 'Settings with Icon',
    description: 'This setting has an icon',
    iconName: IconName.Setting,
    iconColor: mockTheme.colors.primary.default,
  },
};

export const WithoutArrow = {
  ...SettingsDrawer,
  args: {
    title: 'Settings without Arrow',
    description: 'This setting has no arrow',
    renderArrowRight: false,
  },
};

export const FirstAndLastItem = {
  ...SettingsDrawer,
  args: {
    title: 'First and Last Item',
    description: 'This is both first and last item',
    isFirst: true,
    isLast: true,
  },
};

export const LongContent = {
  ...SettingsDrawer,
  args: {
    title:
      'Very Long Settings Option Title That Might Need to Wrap to Multiple Lines',
    description:
      'This is a very long description that contains a lot of text to demonstrate how the component handles long content and wrapping behavior in real-world scenarios.',
  },
};

export const WarningWithIcon = {
  ...SettingsDrawer,
  args: {
    title: 'Warning with Icon',
    description: 'This setting has both warning and icon',
    warning: 'Important warning message',
    iconName: IconName.Danger,
    iconColor: mockTheme.colors.error.default,
  },
};
