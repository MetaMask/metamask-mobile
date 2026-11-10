import React from 'react';
import { Box } from '@metamask/design-system-react-native';

export interface CarouselPaginationDotsProps {
  totalPages: number;
  /** Index of the active page, from 0. */
  activePage: number;
  testID?: string;
}

/**
 * Pagination indicator for a carousel: a 24x4 bar for the active page and
 * a 4x4 dot for every other one, 4pt apart, with 8pt padding on every side
 * (a 20pt-tall row, 72pt wide for five pages). It is decorative, so
 * it is hidden from screen readers and takes no touches. Renders nothing
 * for a single page.
 */
const CarouselPaginationDots = ({
  totalPages,
  activePage,
  testID = 'carousel-pagination-dots',
}: CarouselPaginationDotsProps) => {
  if (totalPages <= 1) return null;

  return (
    <Box
      testID={testID}
      twClassName="flex-row justify-center items-center gap-1 px-2 py-2"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: totalPages }, (_, page) => {
        const isActive = page === activePage;
        return (
          <Box
            key={page}
            testID={isActive ? `${testID}-active` : `${testID}-dot-${page}`}
            twClassName={`h-1 rounded-full ${
              isActive ? 'w-6 bg-icon-default' : 'w-1 bg-icon-alternative'
            }`}
          />
        );
      })}
    </Box>
  );
};

export default CarouselPaginationDots;
