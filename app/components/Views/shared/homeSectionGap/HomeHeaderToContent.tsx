import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import {
  HOME_HEADER_TO_CONTENT_TEST_ID,
  homeHeaderToContentClassName,
} from './homeSectionGap';
import { useHomeSectionGapSelection } from './homeSectionGapStore';

interface HomeHeaderToContentProps {
  children: React.ReactNode;
}

/**
 * Holds every homepage section under the header block (balance or portfolio
 * header). The first section line still uses the between-section margin.
 * This wrapper cancels the extra 4px so the space from that header block to
 * the first line is 16px instead of the production 20px.
 */
const HomeHeaderToContent = ({ children }: HomeHeaderToContentProps) => {
  const selection = useHomeSectionGapSelection();
  const twClassName = homeHeaderToContentClassName(selection);

  return (
    <Box testID={HOME_HEADER_TO_CONTENT_TEST_ID} twClassName={twClassName}>
      {children}
    </Box>
  );
};

export default HomeHeaderToContent;
