import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useBlurMaterial } from '../../../hooks/useBlurMaterial';
import TabBarFloatingSurface from './TabBarFloatingSurface';
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';

/** Shared floating navigation chrome; features supply destinations and the trailing action. */
export default function FloatingTabBarLayout({
  children,
  trailingAction,
  bottomPadding,
  testID = TAB_BAR_FLOATING_TEST_IDS.CONTAINER,
  onLayout,
}: {
  children: React.ReactNode;
  trailingAction: React.ReactNode;
  bottomPadding: number;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const material = useBlurMaterial();
  return (
    <Box
      pointerEvents="box-none"
      twClassName="absolute bottom-0 inset-x-0"
      style={{
        paddingBottom: bottomPadding,
        paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
      }}
      testID={testID}
      onLayout={onLayout}
    >
      <Box
        twClassName="flex-row items-center"
        style={{ gap: TAB_BAR_FLOATING_GAP }}
      >
        <TabBarFloatingSurface
          {...material}
          twClassName="flex-1 flex-row items-center rounded-full p-1"
          style={{ height: TAB_BAR_FLOATING_HEIGHT }}
          testID={TAB_BAR_FLOATING_TEST_IDS.PILL}
        >
          {children}
        </TabBarFloatingSurface>
        <TabBarFloatingSurface
          {...material}
          twClassName="items-center justify-center rounded-full"
          style={{
            height: TAB_BAR_FLOATING_HEIGHT,
            width: TAB_BAR_FLOATING_HEIGHT,
          }}
        >
          {trailingAction}
        </TabBarFloatingSurface>
      </Box>
    </Box>
  );
}
