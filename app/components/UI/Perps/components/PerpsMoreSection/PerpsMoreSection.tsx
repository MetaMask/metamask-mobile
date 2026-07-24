import React from 'react';
import { View } from 'react-native';
import {
  Icon,
  IconName,
  ListItem,
  ListItemVariant,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsMoreItem {
  label: string;
  startIconName: IconName;
  onPress: () => void;
  testID: string;
}

interface PerpsMoreSectionProps {
  items: PerpsMoreItem[];
  testID?: string;
}

const PerpsMoreSection = ({
  items,
  testID = 'perps-more-section',
}: PerpsMoreSectionProps) => (
  <View testID={testID}>
    <SectionHeader title={strings('homepage.sections.more.title')} />
    {items.map((item) => (
      <ListItem
        key={item.testID}
        isInteractive
        variant={ListItemVariant.OneLine}
        title={item.label}
        startAccessory={<Icon name={item.startIconName} />}
        accessoryGap={4}
        onPress={item.onPress}
        testID={item.testID}
      />
    ))}
  </View>
);

export default PerpsMoreSection;
