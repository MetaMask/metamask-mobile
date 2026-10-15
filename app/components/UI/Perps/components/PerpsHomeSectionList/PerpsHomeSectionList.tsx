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

// SectionDivider's default vertical margin is 20px. Section headers add
// another 12px of top padding, so the title sits 32px below the line.
// Later dividers pick up that same 12px from the previous section's bottom
// padding. The first divider has nothing above it, so its top margin is
// raised to 32px to match the space under the line.
const FIRST_DIVIDER_MARGIN_TOP = 32;

/**
 * Renders Perps Home sections with a divider before every visible block,
 * including the first section after balance actions / banners.
 */
const PerpsHomeSectionList: React.FC<PerpsHomeSectionListProps> = ({
  sections,
}) => (
  <>
    {sections.map((section, index) => {
      if (!section.visible) {
        return null;
      }

      const isFirstVisibleSection = !sections
        .slice(0, index)
        .some((previousSection) => previousSection.visible);

      return (
        <Fragment key={section.key}>
          <SectionDivider
            testID="perps-home-section-divider"
            style={
              isFirstVisibleSection
                ? { marginTop: FIRST_DIVIDER_MARGIN_TOP }
                : undefined
            }
          />
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
