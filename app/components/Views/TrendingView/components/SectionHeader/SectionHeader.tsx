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
import { strings } from '../../../../../../locales/i18n';

interface SectionHeaderProps {
  title: string;
  onViewAll: () => void;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onViewAll }) => (
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
        {strings('trending.view_all')}
      </Text>
    </TouchableOpacity>
  </Box>
);

export default SectionHeader;
