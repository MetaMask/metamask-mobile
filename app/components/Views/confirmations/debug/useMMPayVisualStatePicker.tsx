import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { NavbarOverrides } from '../components/UI/navbar/navbar';
import { MMPayVisualStateBottomSheet } from './MMPayVisualStateBottomSheet';
import { useMMPayVisualOverrides } from './mmPayVisualValidation';

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 16,
  },
  headerRightRow: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export const MM_PAY_VISUAL_STATE_FLASK_TEST_ID = 'mm-pay-visual-state-flask';

/**
 * __DEV__ flask + bottom-sheet picker for MetaMask Pay confirmation visual QA.
 * Returns navbar overrides and a sheet node to render beside the page.
 *
 * Pass `forcedNavbarTitle ?? liveTitle` into `useNavbar` so flow-specific
 * error presets update the real page title (e.g. Withdraw).
 */
export function useMMPayVisualStatePicker(options?: {
  /**
   * Extra end-accessory content (e.g. mUSD info button). Flask is prepended.
   */
  extraHeaderRight?: () => React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { extraHeaderRight } = options ?? {};
  const visualOverrides = useMMPayVisualOverrides();
  const forcedNavbarTitle = visualOverrides?.forceNavbarTitle ?? null;

  const openSheet = useCallback(() => {
    if (__DEV__) {
      setSheetOpen(true);
    }
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const renderFlask = useCallback(
    () => (
      <ButtonIcon
        iconName={IconName.Flask}
        size={ButtonIconSize.Md}
        iconProps={{ color: IconColor.IconAlternative }}
        onPress={openSheet}
        testID={MM_PAY_VISUAL_STATE_FLASK_TEST_ID}
      />
    ),
    [openSheet],
  );

  const navbarOverrides: NavbarOverrides | undefined = useMemo(() => {
    if (!__DEV__) {
      return undefined;
    }
    return {
      headerRight: () => {
        if (extraHeaderRight) {
          return (
            <View style={styles.headerRightRow}>
              {renderFlask()}
              {extraHeaderRight()}
            </View>
          );
        }
        return <View style={styles.headerRight}>{renderFlask()}</View>;
      },
    };
  }, [extraHeaderRight, renderFlask]);

  const sheet =
    __DEV__ && sheetOpen ? (
      <MMPayVisualStateBottomSheet isVisible={sheetOpen} onClose={closeSheet} />
    ) : null;

  return {
    navbarOverrides,
    sheet,
    renderFlask,
    openSheet,
    /** Forced navbar title for the selected preset; null when Live. */
    forcedNavbarTitle,
  };
}
