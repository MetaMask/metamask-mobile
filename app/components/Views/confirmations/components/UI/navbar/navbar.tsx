import React, { ReactNode } from 'react';
import { Platform, ViewStyle } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';

export const NAVBAR_SHEET_HANDLE_TEST_ID = 'navbar-sheet-handle';

/**
 * Optional overrides for navbar customization.
 * Each property mirrors the return value of getNavbar.
 */
export interface NavbarOverrides {
  headerTitle?: () => ReactNode;
  /** Custom header left component. Receives onBackPress for rejection handling. */
  headerLeft?: (onBackPress: () => void) => ReactNode;
  /** Custom header right component. */
  headerRight?: (onPress: () => void) => ReactNode;
  /** Additional styles to merge with header */
  headerStyle?: ViewStyle;
}

export interface NavbarOptions {
  title: string;
  onReject?: () => void;
  addBackButton?: boolean;
  /** @deprecated No longer used. Theming is handled by the bg-default Tailwind token. */
  theme?: unknown;
  overrides?: NavbarOverrides;
  mmPayRequestInProgressNavHandler?: React.RefObject<(() => void) | false>;
  /**
   * Set when the confirmation is presented as a sheet instead of filling the
   * window. The sheet already starts below the notch, so the header must not
   * add the top inset on top of that, and it gets a drag handle like other
   * sheets.
   */
  sheetPresentation?: boolean;
}

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
  overrides,
  mmPayRequestInProgressNavHandler,
  sheetPresentation = false,
}: NavbarOptions) {
  const isSheetPresentation = sheetPresentation && Platform.OS === 'ios';

  function handleBackPress() {
    if (mmPayRequestInProgressNavHandler?.current) {
      mmPayRequestInProgressNavHandler.current();
      return;
    }
    if (onReject) {
      onReject();
    }
  }

  const customTitle = overrides?.headerTitle?.();
  const customLeft = overrides?.headerLeft
    ? overrides.headerLeft(handleBackPress)
    : undefined;
  const customRight = overrides?.headerRight
    ? overrides.headerRight(handleBackPress)
    : undefined;

  return {
    header: () => {
      const header = (
        <HeaderCompactStandard
          title={title}
          onBack={addBackButton ? handleBackPress : undefined}
          backButtonProps={
            addBackButton
              ? { testID: `${title}-navbar-back-button` }
              : undefined
          }
          startAccessory={customLeft}
          endAccessory={customRight}
          style={overrides?.headerStyle}
          includesTopInset={!isSheetPresentation}
          twClassName="bg-default"
        >
          {customTitle}
        </HeaderCompactStandard>
      );

      if (!isSheetPresentation) {
        return header;
      }

      return (
        <Box twClassName="bg-default">
          <Box
            twClassName="items-center p-1"
            testID={NAVBAR_SHEET_HANDLE_TEST_ID}
          >
            <Box twClassName="w-10 h-1 rounded-full bg-border-muted" />
          </Box>
          {header}
        </Box>
      );
    },
  };
}

export function getEmptyNavHeader() {
  const navbarOptions = getNavbar({
    title: '',
    addBackButton: false,
  });
  return {
    ...navbarOptions,
    headerShown: true,
    gestureEnabled: false,
  };
}

export function getModalNavigationOptions() {
  return {
    title: '',
    headerLeft: () => null,
    headerTransparent: true,
    headerRight: () => null,
  };
}
