import type { PERPS_EVENT_VALUE } from '@metamask/perps-controller';

export interface PerpsBalanceBottomSheetProps {
  /** Whether the bottom sheet is visible. */
  isVisible: boolean;
  /** Callback invoked when the sheet is dismissed (swipe, backdrop tap, or close button). */
  onClose: () => void;
  /** Analytics location of the button that opened the sheet. */
  buttonLocation: (typeof PERPS_EVENT_VALUE.BUTTON_LOCATION)[keyof typeof PERPS_EVENT_VALUE.BUTTON_LOCATION];
  /**
   * Analytics `source` naming the presenting screen. Required so events
   * raised here can attribute the screen that opened the sheet.
   */
  source: (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE];
  /** Optional testID override for the root BottomSheet. */
  testID?: string;
}
