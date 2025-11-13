import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

interface SectionHeaderProps {
  title: string;
  viewAllText: string;
  onViewAll: () => void;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  viewAllText,
  onViewAll,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    style={styles.container}
  >
    <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
      {title}
    </Text>
    <TouchableOpacity onPress={onViewAll}>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
        {viewAllText}
      </Text>
    </TouchableOpacity>
  </Box>
);

export default SectionHeader;
