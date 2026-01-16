import React from 'react';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
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
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="mb-2"
    >
      <Text variant={TextVariant.HeadingSm}>{sectionConfig.title}</Text>
      <TouchableOpacity
        onPress={() => sectionConfig.viewAllAction(navigation)}
        style={tw.style('flex-row items-center justify-center gap-1')}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('trending.view_all')}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </TouchableOpacity>
    </Box>
  );
};

export default SectionHeader;
