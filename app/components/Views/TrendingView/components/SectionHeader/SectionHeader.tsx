import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';
import { useNavigation } from '@react-navigation/native';

export interface SectionHeaderProps {
  sectionId: SectionId;
}

/**
 * Displays a section header with title and "View All" button.
 * All configuration is pulled from sections.config.tsx based on the sectionId.
 *
 * This component is part of the centralized section management system that ensures
 * consistency between QuickActions buttons and section "View All" buttons.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ sectionId }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const sectionConfig = SECTIONS_CONFIG[sectionId];

  return (
    <TouchableOpacity
      testID={`section-header-view-all-${sectionId}`}
      style={tw.style('flex-row items-center mb-2')}
      onPress={() => sectionConfig.viewAllAction(navigation)}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
          {sectionConfig.title}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default SectionHeader;
