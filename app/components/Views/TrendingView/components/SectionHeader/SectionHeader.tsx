import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { AppNavigationProp } from '../../../../../core/NavigationService/types';

export interface SectionHeaderProps {
  sectionId: SectionId;
}

/**
 * Displays a section header with title and "View All" button.
 * All configuration is pulled from sections.config.tsx based on the sectionId.
 *
 * This component is part of the centralized section management system that ensures
 * section "View All" uses the same navigation as defined in the section config.
 */
const TrendingSectionHeader: React.FC<SectionHeaderProps> = ({ sectionId }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const sectionConfig = SECTIONS_CONFIG[sectionId];
  const showViewAll = sectionConfig.showViewAllInHeader !== false;

  return (
    <>
      <SectionHeader
        testID={`section-header-view-all-${sectionId}`}
        title={sectionConfig.title}
        onPress={
          showViewAll
            ? () => sectionConfig.viewAllAction(navigation)
            : undefined
        }
        twClassName={`px-0 ${sectionConfig.subtitle ? 'mb-0.5' : 'mb-2'}`}
      />
      {sectionConfig.subtitle && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {sectionConfig.subtitle}
        </Text>
      )}
    </>
  );
};

export default TrendingSectionHeader;
