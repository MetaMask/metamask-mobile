import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import styles from './PerpsMoreSection.styles';
import { PerpsMoreSectionTestIds } from './PerpsMoreSection.testIds';

export interface PerpsMoreItem {
  label: string;
  startIconName: IconName;
  endIconName?: IconName;
  onPress: () => void;
  testID: string;
}

interface PerpsMoreSectionProps {
  items: PerpsMoreItem[];
  testID?: string;
}

interface PerpsMoreActionRowProps {
  label: string;
  startIconName: IconName;
  endIconName?: IconName;
  onPress: () => void;
  testID: string;
}

const PerpsMoreActionRow = ({
  label,
  startIconName,
  endIconName,
  onPress,
  testID,
}: PerpsMoreActionRowProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    style={styles.row}
    testID={testID}
  >
    <Icon
      name={startIconName}
      size={IconSize.Md}
      color={IconColor.IconDefault}
      style={styles.startIcon}
    />
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      style={styles.label}
    >
      {label}
    </Text>
    {endIconName ? (
      <Icon
        name={endIconName}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    ) : null}
  </TouchableOpacity>
);

const PerpsMoreSection = ({
  items,
  testID = PerpsMoreSectionTestIds.SECTION,
}: PerpsMoreSectionProps) => (
  <View testID={testID}>
    <SectionHeader title={strings('homepage.sections.more.title')} />
    {items.map((item) => (
      <PerpsMoreActionRow
        key={item.testID}
        label={item.label}
        startIconName={item.startIconName}
        endIconName={item.endIconName}
        onPress={item.onPress}
        testID={item.testID}
      />
    ))}
  </View>
);

export default PerpsMoreSection;
