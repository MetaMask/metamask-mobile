// Third party dependencies.
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';

// External dependencies.
import {
  IconName,
  Box,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import Text, { TextColor, FontWeight } from '../../components/Texts/Text';

// Internal dependencies.
import { default as ActionListItemComponent } from './ActionListItem';
import { SAMPLE_ACTIONLISTITEM_PROPS } from './ActionListItem.constants';

const ActionListItemMeta: Meta<typeof ActionListItemComponent> = {
  title: 'Components Temp / ActionListItem',
  component: ActionListItemComponent,
};

export default ActionListItemMeta;

type Story = StoryObj<typeof ActionListItemComponent>;

export const Default: Story = {
  render: () => <ActionListItemComponent {...SAMPLE_ACTIONLISTITEM_PROPS} />,
};

export const WithoutDescription: Story = {
  render: () => (
    <ActionListItemComponent
      label="Sample Action"
      iconName={IconName.Add}
      onPress={() => console.log('Action pressed')}
    />
  ),
};

export const WithDifferentIcon: Story = {
  render: () => (
    <ActionListItemComponent
      label="Settings"
      description="Manage your preferences"
      iconName={IconName.Setting}
      onPress={() => console.log('Settings pressed')}
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <ActionListItemComponent {...SAMPLE_ACTIONLISTITEM_PROPS} disabled />
  ),
};

export const WithCustomLabel: Story = {
  render: () => (
    <ActionListItemComponent
      label={<Text color={TextColor.Primary}>Custom Label Component</Text>}
      description="This has a custom label component"
      iconName={IconName.Add}
      onPress={() => console.log('Custom label pressed')}
    />
  ),
};

export const WithStartAccessory: Story = {
  render: () => (
    <ActionListItemComponent
      label="Custom Action"
      description="Action with start accessory"
      startAccessory={
        <Box
          style={{
            width: 40,
            height: 40,
            backgroundColor: '#3B82F6',
            borderRadius: 20,
          }}
        />
      }
      onPress={() => console.log('Action pressed')}
    />
  ),
};

export const WithEndAccessory: Story = {
  render: () => (
    <ActionListItemComponent
      label="Action with End Content"
      description="This action has an end accessory"
      iconName={IconName.Add}
      endAccessory={<Text color={TextColor.Alternative}>→</Text>}
      onPress={() => console.log('Action pressed')}
    />
  ),
};

export const AssetActions: Story = {
  render: () => (
    <Box flexDirection={BoxFlexDirection.Column}>
      <ActionListItemComponent
        label="Buy"
        description="Purchase crypto with fiat"
        iconName={IconName.Add}
        onPress={() => console.log('Buy pressed')}
      />
      <ActionListItemComponent
        label="Sell"
        description="Convert crypto to fiat"
        iconName={IconName.MinusBold}
        onPress={() => console.log('Sell pressed')}
      />
      <ActionListItemComponent
        label="Swap"
        description="Exchange one token for another"
        iconName={IconName.SwapHorizontal}
        onPress={() => console.log('Swap pressed')}
      />
      <ActionListItemComponent
        label="Send"
        description="Transfer tokens to another wallet"
        iconName={IconName.Arrow2UpRight}
        onPress={() => console.log('Send pressed')}
      />
      <ActionListItemComponent
        label="Receive"
        description="Get tokens from another wallet"
        iconName={IconName.Received}
        onPress={() => console.log('Receive pressed')}
      />
    </Box>
  ),
};
