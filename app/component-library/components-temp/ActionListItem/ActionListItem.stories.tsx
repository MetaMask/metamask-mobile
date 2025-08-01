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
    onPress: () => console.log('Basic ActionListItem pressed'),
  },
};

// With icon
export const WithIcon = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    iconName: IconName.Setting,
    onPress: () => console.log('ActionListItem with icon pressed'),
  },
};

// With start accessory
export const WithStartAccessory = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    startAccessory: <Icon name={IconName.Security} />,
    onPress: () => console.log('ActionListItem with start accessory pressed'),
  },
};

// With end accessory
export const WithEndAccessory = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    endAccessory: <Icon name={IconName.ArrowRight} />,
    onPress: () => console.log('ActionListItem with end accessory pressed'),
  },
};

// With both start and end accessories
export const WithBothAccessories = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    startAccessory: <Icon name={IconName.Security} />,
    endAccessory: <Icon name={IconName.ArrowRight} />,
    onPress: () => console.log('ActionListItem with both accessories pressed'),
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
    onPress: () => console.log('ActionListItem with custom nodes pressed'),
  },
};

// Only label (no description)
export const LabelOnly = {
  args: {
    label: 'Simple label without description',
    iconName: IconName.Apps,
    onPress: () => console.log('Label-only ActionListItem pressed'),
  },
};

// Disabled state
export const Disabled = {
  args: {
    ...SAMPLE_ACTIONLISTITEM_PROPS,
    iconName: IconName.Setting,
    disabled: true,
    onPress: () => console.log('This should not be called when disabled'),
  },
};

// Comprehensive demo showing multiple variations
export const AllVariations = {
  render: () => {
    const styles = StyleSheet.create({
      container: {
        backgroundColor: '#f5f5f5',
        padding: 16,
      },
      section: {
        backgroundColor: 'white',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
      },
      sectionTitle: {
        padding: 16,
        backgroundColor: '#e0e0e0',
        fontSize: 14,
        fontWeight: 'bold',
      },
    });

    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Examples</Text>
          <ActionListItemComponent
            label="Basic item"
            description="Simple label and description"
            onPress={() => console.log('Basic pressed')}
          />
          <ActionListItemComponent
            label="With icon"
            description="Has an icon on the left"
            iconName={IconName.Setting}
            onPress={() => console.log('With icon pressed')}
          />
          <ActionListItemComponent
            label="Label only"
            iconName={IconName.Apps}
            onPress={() => console.log('Label only pressed')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>With Accessories</Text>
          <ActionListItemComponent
            label="Custom start accessory"
            description="Uses a custom component instead of icon"
            startAccessory={<Icon name={IconName.Security} />}
            onPress={() => console.log('Custom start accessory pressed')}
          />
          <ActionListItemComponent
            label="With end accessory"
            description="Shows a chevron on the right"
            iconName={IconName.Notification}
            endAccessory={<Icon name={IconName.ArrowRight} />}
            onPress={() => console.log('With end accessory pressed')}
          />
          <ActionListItemComponent
            label="Both accessories"
            description="Start and end accessories together"
            startAccessory={<Icon name={IconName.Star} />}
            endAccessory={<Icon name={IconName.MoreVertical} />}
            onPress={() => console.log('Both accessories pressed')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Content</Text>
          <ActionListItemComponent
            label={<Text variant={TextVariant.BodyMd}>Bold Custom Label</Text>}
            description={
              <Text variant={TextVariant.BodySm}>
                Custom description component
              </Text>
            }
            iconName={IconName.Star}
            onPress={() => console.log('Custom content pressed')}
          />
        </View>
      </View>
    );
  },
};
