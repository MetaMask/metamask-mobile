import React from 'react';
import {
  SectionDivider,
  type SectionDividerProps,
} from '@metamask/design-system-react-native';

import { homeSectionDividerMarginStep } from './homeSectionGap';
import { useHomeSectionGapSelection } from './homeSectionGapStore';

/**
 * Homepage section line. Production keeps the design-system 20px margin.
 * The dev control replaces that margin with 8, 12, 16, or 24px on each side.
 */
const HomepageSectionDivider = (props: SectionDividerProps) => {
  const selection = useHomeSectionGapSelection();

  if (selection === 'production') {
    return <SectionDivider {...props} />;
  }

  return (
    <SectionDivider
      {...props}
      marginVertical={homeSectionDividerMarginStep(selection)}
    />
  );
};

export default HomepageSectionDivider;
