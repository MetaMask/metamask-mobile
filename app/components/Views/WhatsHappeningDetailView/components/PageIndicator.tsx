import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

interface PageIndicatorProps {
  count: number;
  activeIndex: number;
}

const PageIndicator: React.FC<PageIndicatorProps> = ({
  count,
  activeIndex,
}) => {
  const tw = useTailwind();

  if (count <= 1) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={1}
      twClassName="py-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          style={
            index === activeIndex
              ? tw.style('w-6 h-2 rounded-full bg-icon-default')
              : tw.style('w-2 h-2 rounded-full bg-icon-muted')
          }
        />
      ))}
    </Box>
  );
};

export default PageIndicator;
