import React, { useCallback, useState } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { PerpsClosePositionVisualStateBottomSheet } from './PerpsClosePositionVisualStateBottomSheet';
import {
  PerpsSliderInputVisualPage,
  usePerpsClosePositionVisualOverrides,
  usePerpsMarginVisualOverrides,
} from './perpsClosePositionVisualValidation';

export const PERPS_CLOSE_POSITION_VISUAL_STATE_FLASK_TEST_ID =
  'perps-close-position-visual-state-flask';

/**
 * __DEV__ flask + bottom-sheet picker for Perps slider-input screens
 * (Close Position and Add/Remove Margin).
 * Compose `renderFlask()` into `PerpsOrderHeader` endAccessoryLeading.
 */
export function usePerpsClosePositionVisualStatePicker(
  page: PerpsSliderInputVisualPage = 'close',
) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeOverrides = usePerpsClosePositionVisualOverrides();
  const marginOverrides = usePerpsMarginVisualOverrides();
  const visualOverrides = page === 'margin' ? marginOverrides : closeOverrides;

  const openSheet = useCallback(() => {
    if (__DEV__) {
      setSheetOpen(true);
    }
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const renderFlask = useCallback(() => {
    if (!__DEV__) {
      return null;
    }
    return (
      <ButtonIcon
        iconName={IconName.Flask}
        size={ButtonIconSize.Md}
        iconProps={{ color: IconColor.IconAlternative }}
        onPress={openSheet}
        testID={PERPS_CLOSE_POSITION_VISUAL_STATE_FLASK_TEST_ID}
      />
    );
  }, [openSheet]);

  const sheet =
    __DEV__ && sheetOpen ? (
      <PerpsClosePositionVisualStateBottomSheet
        isVisible={sheetOpen}
        onClose={closeSheet}
        page={page}
      />
    ) : null;

  return {
    visualOverrides,
    renderFlask,
    sheet,
    openSheet,
  };
}
