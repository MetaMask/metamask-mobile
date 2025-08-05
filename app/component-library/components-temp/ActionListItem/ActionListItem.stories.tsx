// Third party dependencies.
import React from 'react';
import { View, StyleSheet } from 'react-native';

// External dependencies.
import {
  Icon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

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
    disabled: {
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
    disabled: true,
  },
};

// Comprehensive demo showing multiple variations
export const AllVariations = {
  render: () => {
    const styles = StyleSheet.create({
      container: {
        padding: 16,
      },
      section: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
      },
      sectionTitle: {
        padding: 16,
      },
    });

    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Examples</Text>
          <ActionListItemComponent
            label="Basic item"
            description="Simple label and description"
          />
          <ActionListItemComponent
            label="With icon"
            description="Has an icon on the left"
            iconName={IconName.Setting}
          />
          <ActionListItemComponent
            label="Label only"
            iconName={IconName.Apps}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With Accessories</Text>
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
      </View>
    );
  },
};
