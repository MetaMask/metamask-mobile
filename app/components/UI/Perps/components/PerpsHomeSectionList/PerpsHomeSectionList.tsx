import React, { Fragment } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { SectionDivider } from '@metamask/design-system-react-native';

export interface PerpsHomeSectionItem {
  key: string;
  visible: boolean;
  content: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}

interface PerpsHomeSectionListProps {
  sections: PerpsHomeSectionItem[];
}

/**
 * Renders Perps Home sections with a divider before every visible block,
 * including the first section after balance actions / banners.
 */
const PerpsHomeSectionList: React.FC<PerpsHomeSectionListProps> = ({
  sections,
}) => (
  <>
    {sections.map((section) => {
      if (!section.visible) {
        return null;
      }

      return (
        <Fragment key={section.key}>
          <SectionDivider testID="perps-home-section-divider" />
          <View
            testID={`perps-home-section-${section.key}`}
            onLayout={section.onLayout}
          >
            {section.content}
          </View>
        </Fragment>
      );
    })}
  </>
);

export default PerpsHomeSectionList;
