import React from 'react';
import { View } from 'react-native';
import { Meta, StoryObj } from '@storybook/react-native';
import SettingsDrawer from './';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';

const backdropStyle = { backgroundColor: 'white', padding: 16 };

const meta: Meta<typeof SettingsDrawer> = {
  title: 'Components/UI/SettingsDrawer',
  component: SettingsDrawer,
  decorators: [(Story) => <View style={backdropStyle}>{Story()}</View>],
};

export default meta;

type Story = StoryObj<React.ComponentProps<typeof SettingsDrawer>>;

const mockPress = () => undefined;

export const Default: Story = {
  args: {
    title: 'Settings Option',
    description: 'This is a description of the settings option',
    onPress: mockPress,
  },
};

export const WithWarning: Story = {
  args: {
    ...Default.args,
    warning: 'Important warning message',
  },
};

export const WithIcon: Story = {
  args: {
    ...Default.args,
    iconName: IconName.Setting,
    iconColor: '#037DD6',
  },
};

export const WithoutArrow: Story = {
  args: {
    ...Default.args,
    renderArrowRight: false,
  },
};

export const CustomTitleColor: Story = {
  args: {
    ...Default.args,
    titleColor: TextColor.Primary,
  },
};

export const FirstItem: Story = {
  args: {
    ...Default.args,
    isFirst: true,
  },
};

export const LastItem: Story = {
  args: {
    ...Default.args,
    isLast: true,
  },
};

export const FirstAndLastItem: Story = {
  args: {
    ...Default.args,
    isFirst: true,
    isLast: true,
  },
};

export const LongContent: Story = {
  args: {
    title:
      'Very Long Settings Option Title That Might Need to Wrap to Multiple Lines',
    description:
      'This is a very long description that contains a lot of text to demonstrate how the component handles long content and wrapping behavior in real-world scenarios.',
    onPress: () => mockPress,
  },
};

export const WithoutDescription: Story = {
  args: {
    title: 'Settings Option',
    onPress: () => mockPress,
  },
};

export const WithWarningAndIcon: Story = {
  args: {
    ...Default.args,
    warning: 'Important warning message',
    iconName: IconName.Danger,
    iconColor: '#D73847',
  },
};
