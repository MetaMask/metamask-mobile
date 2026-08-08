import React from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PaginationDotsProps {
  count: number;
  activeIndex: number;
  testID?: string;
}

/**
 * Shared pagination dots indicator for horizontal carousels.
 *
 * Renders one dot per item with the active dot expanded into a pill. Returns
 * `null` when there is at most one item. The `testID` defaults to the Featured
 * carousel's value so existing consumers keep their behavior unchanged.
 */
export const PaginationDots: React.FC<PaginationDotsProps> = ({
  count,
  activeIndex,
  testID = 'featured-carousel-pagination-dots',
}) => {
  const tw = useTailwind();

  if (count <= 1) return null;

  return (
    <Box
      testID={testID}
      twClassName="flex-row justify-center items-center gap-2 mt-3"
    >
      {Array.from({ length: count }).map((_, dotPosition) => (
        <View
          key={`pagination-dot-${dotPosition}`}
          style={tw.style(
            'h-2 rounded-full',
            dotPosition === activeIndex
              ? 'bg-icon-alternative'
              : 'bg-icon-muted w-2',
            dotPosition === activeIndex && { width: 35 },
          )}
        />
      ))}
    </Box>
  );
};

export default PaginationDots;
