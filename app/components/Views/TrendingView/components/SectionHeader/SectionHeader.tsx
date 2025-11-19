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
import { SectionId, SECTIONS_CONFIG } from '../../config/sections.config';
import { useNavigation } from '@react-navigation/native';

export interface SectionHeaderProps {
  sectionId: SectionId;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});

/**
 * Displays a section header with title and "View All" button.
 * All configuration is pulled from sections.config.tsx based on the sectionId.
 *
 * This component is part of the centralized section management system that ensures
 * consistency between QuickActions buttons and section "View All" buttons.
 */
const SectionHeader = ({ sectionId }: SectionHeaderProps) => {
  const navigation = useNavigation();
  const sectionConfig = SECTIONS_CONFIG[sectionId];

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      style={styles.container}
    >
      <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
        {sectionConfig.title}
      </Text>
      <TouchableOpacity onPress={() => sectionConfig.viewAllAction(navigation)}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('trending.view_all')}
        </Text>
      </TouchableOpacity>
    </Box>
  );
};

export default SectionHeader;
