import React, { Fragment } from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';

export interface ExploreSectionItem {
  key: string;
  content: React.ReactNode;
  /** Vertical card lists omit pb-3 before the next section. */
  isVerticalList?: boolean;
}

interface ExploreSectionListProps {
  sections: ExploreSectionItem[];
  includeDividers?: boolean;
}

/**
 * Renders Explore tab sections with dividers between visible blocks.
 * The tab owns section order and visibility; sections render content only.
 */
const ExploreSectionList: React.FC<ExploreSectionListProps> = ({
  sections,
  includeDividers = true,
}) => (
  <>
    {sections.map((section, index) => (
      <Fragment key={section.key}>
        {includeDividers && index > 0 ? (
          <Box testID="explore-section-divider">
            <SectionDivider />
          </Box>
        ) : null}
        <Box
          testID={`explore-section-${section.key}`}
          twClassName={
            index < sections.length - 1 && !section.isVerticalList
              ? 'pb-3'
              : undefined
          }
        >
          {section.content}
        </Box>
      </Fragment>
    ))}
  </>
);

export default ExploreSectionList;
