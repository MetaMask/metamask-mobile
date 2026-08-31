import React, { forwardRef, type ComponentPropsWithoutRef } from 'react';
import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

/**
 * TabsBar sits above Recurring tab content in BridgeView. Design-system
 * BottomSheet is `absolute inset-0` relative to that pane, so the overlay
 * would stop under Market / Limit / Recurring. Pull it up by the tab bar
 * height so the dim covers those tabs. Tab layout tests use height 40.
 */
export const BRIDGE_TABS_BAR_HEIGHT = 40;

const RecurringBottomSheet = forwardRef<
  BottomSheetRef,
  ComponentPropsWithoutRef<typeof BottomSheet>
>(function RecurringBottomSheet({ style, ...props }, ref) {
  return (
    <BottomSheet
      {...props}
      ref={ref}
      style={[{ top: -BRIDGE_TABS_BAR_HEIGHT, zIndex: 1 }, style]}
    />
  );
});

export default RecurringBottomSheet;
