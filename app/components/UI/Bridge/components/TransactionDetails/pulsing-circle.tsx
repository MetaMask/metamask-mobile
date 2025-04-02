import React from 'react';
import HollowCircle from './hollow-circle';
import { IconSize, IconColor } from '../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../Box/Box';
import { AlignItems, BackgroundColor, BorderRadius, JustifyContent } from '../../../Box/box.types';

/**
 * Renders the steps in the Bridge Transaction Details page
 *
 * @param options
 * @param options.iconSize - The size of the icon
 * @param options.color - The color of the icon
 */
export default function PulsingCircle({
  iconSize,
  color,
}: {
  iconSize: IconSize;
  color: IconColor;
}) {
  return (
    <Box style={{ position: 'relative' }}>
      <Box
        // className="bridge-transaction-details__icon-loading" // Needed for animation
        backgroundColor={BackgroundColor.primaryMuted}
        justifyContent={JustifyContent.center}
        alignItems={AlignItems.center}
        // borderRadius={BorderRadius.full}
        // style={{ width: '2rem', height: '2rem' }}
      ></Box>
      <HollowCircle
        size={iconSize}
        color={color}
        // style={{
        //   position: 'absolute',
        //   left: '50%',
        //   top: '50%',
        //   transform: 'translate(-50%, -50%)',
        //   borderWidth: '2px',
        // }}
      />
    </Box>
  );
}
