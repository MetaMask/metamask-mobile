// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import {
  Icon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { default as ActionListItemComponent } from './ActionListItem';
import { SAMPLE_ACTIONLISTITEM_PROPS } from './ActionListItem.constants';

const ActionListItemMeta = {
  title: 'Components Temp / ActionListItem',
  component: ActionListItemComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      description: 'Label text or component to display',
    },
    description: {
      control: { type: 'text' },
      description: 'Optional description text or component',
    },
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      description: 'Optional icon name from design system',
    },
    isDisabled: {
      control: { type: 'boolean' },
      description: 'Whether the item is disabled',
    },
  },
};

export default ActionListItemMeta;

// Basic story with text label and description
export const Basic = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
  },
};

// With icon
export const WithIcon = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    iconName: IconName.Setting,
  },
};

// With start accessory
export const WithStartAccessory = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    startAccessory: <Icon name={IconName.Security} />,
  },
};

// With end accessory
export const WithEndAccessory = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    endAccessory: <Icon name={IconName.ArrowRight} />,
  },
};

// With both start and end accessories
export const WithBothAccessories = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    startAccessory: <Icon name={IconName.Security} />,
    endAccessory: <Icon name={IconName.ArrowRight} />,
  },
};

// With React node label and description
export const WithCustomNodes = {
  args: {
    label: <Text variant={TextVariant.BodyMd}>Custom Bold Label</Text>,
    description: (
      <Text variant={TextVariant.BodySm}>
        Custom description with different styling
      </Text>
    ),
    iconName: IconName.Add,
    endAccessory: <Icon name={IconName.MoreVertical} />,
  },
};

// Only label (no description)
export const LabelOnly = {
  args: {
    label: 'Simple label without description',
    iconName: IconName.Apps,
  },
};

// Disabled state
export const Disabled = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    iconName: IconName.Setting,
    isDisabled: true,
  },
};

// Comparison of enabled vs disabled
const EnabledVsDisabledComponent = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 gap-1')}>
      <Text style={tw.style('p-2 text-base font-medium')}>
        Enabled vs Disabled Comparison
      </Text>
      <ActionListItemComponent
        label="Enabled Item"
        description="This item is interactive and fully opaque"
        iconName={IconName.Setting}
        isDisabled={false}
        onPress={() => {
          // Demo press handler
        }}
      />
      <ActionListItemComponent
        label="Disabled Item"
        description="This item has 50% opacity and is not interactive"
        iconName={IconName.Setting}
        isDisabled
        onPress={() => {
          // This should not be called
        }}
      />
    </View>
  );
};

export const EnabledVsDisabled = {
  render: () => <EnabledVsDisabledComponent />,
};

// Comprehensive demo showing multiple variations
const AllVariationsComponent = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4')}>
      <View style={tw.style('mb-4 rounded-lg overflow-hidden')}>
        <Text style={tw.style('p-4')}>Basic Examples</Text>
        <ActionListItemComponent
          label="Basic item"
          description="Simple label and description"
        />
        <ActionListItemComponent
          label="With icon"
          description="Has an icon on the left"
          iconName={IconName.Setting}
        />
        <ActionListItemComponent label="Label only" iconName={IconName.Apps} />
      </View>

      <View style={tw.style('mb-4 rounded-lg overflow-hidden')}>
        <Text style={tw.style('p-4')}>With Accessories</Text>
        <ActionListItemComponent
          label="Custom start accessory"
          description="Uses a custom component instead of icon"
          startAccessory={<Icon name={IconName.Security} />}
        />
        <ActionListItemComponent
          label="With end accessory"
          description="Shows a chevron on the right"
          iconName={IconName.Notification}
          endAccessory={<Icon name={IconName.ArrowRight} />}
        />
        <ActionListItemComponent
          label="Both accessories"
          description="Start and end accessories together"
          startAccessory={<Icon name={IconName.Star} />}
          endAccessory={<Icon name={IconName.MoreVertical} />}
        />
      </View>

      <View style={tw.style('mb-4 rounded-lg overflow-hidden')}>
        <Text style={tw.style('p-4')}>Disabled State</Text>
        <ActionListItemComponent
          label="Disabled item"
          description="This item is disabled with 50% opacity"
          iconName={IconName.Setting}
          isDisabled
        />
        <ActionListItemComponent
          label="Normal item"
          description="This item is enabled for comparison"
          iconName={IconName.Setting}
          isDisabled={false}
        />
      </View>
    </View>
  );
};

export const AllVariations = {
  render: () => <AllVariationsComponent />,
};
