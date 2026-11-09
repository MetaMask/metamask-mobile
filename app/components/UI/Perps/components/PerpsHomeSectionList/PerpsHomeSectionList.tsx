import React, { Fragment } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { SectionDivider } from '@metamask/design-system-react-native';
import { ViewportLifecycle } from '../../../ViewportLifecycle';

export interface PerpsHomeSectionItem {
  key: string;
  visible: boolean;
  content: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}

interface PerpsHomeSectionListProps {
  sections: PerpsHomeSectionItem[];
  /** Skip the divider above the first visible section (e.g. right under a tab bar). */
  hideLeadingDivider?: boolean;
  /** Mount sections before their first viewport measurement. Pass `false` for below-fold lists. */
  initiallyMounted?: boolean;
}

/**
 * Renders Perps Home sections with a divider before every visible block,
 * including the first section after balance actions / banners.
 */
const PerpsHomeSectionList: React.FC<PerpsHomeSectionListProps> = ({
  sections,
  hideLeadingDivider = false,
  initiallyMounted = true,
}) => {
  const firstVisibleKey = sections.find((section) => section.visible)?.key;

  return (
    <>
      {sections.map((section) => {
        if (!section.visible) {
          return null;
        }

        const showDivider =
          !hideLeadingDivider || section.key !== firstVisibleKey;

        return (
          <Fragment key={section.key}>
            {showDivider ? (
              <SectionDivider testID="perps-home-section-divider" />
            ) : null}
            <View
              testID={`perps-home-section-${section.key}`}
              onLayout={section.onLayout}
            >
              <ViewportLifecycle
                mode="unmount-when-far"
                initiallyMounted={initiallyMounted}
                preloadMargin={400}
                placeholderHeight={220}
              >
                {section.content}
              </ViewportLifecycle>
            </View>
          </Fragment>
        );
      })}
    </>
  );
};

export default PerpsHomeSectionList;
