import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';

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
const TrendingSectionHeader: React.FC<SectionHeaderProps> = ({ sectionId }) => {
  const navigation = useNavigation();
  const sectionConfig = SECTIONS_CONFIG[sectionId];

  return (
    <SectionHeader
      testID={`section-header-view-all-${sectionId}`}
      title={sectionConfig.title}
      onPress={() => sectionConfig.viewAllAction(navigation)}
      twClassName="px-0 mb-2"
    />
  );
};

export default TrendingSectionHeader;
