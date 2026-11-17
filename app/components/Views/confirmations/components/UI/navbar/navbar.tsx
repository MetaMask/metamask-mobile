import React, { ReactNode } from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import HeaderStandardGlass, {
  type HeaderStandardGlassProps,
} from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { useTheme } from '../../../../../../util/theme';

export const NAVBAR_SHEET_HANDLE_TEST_ID = 'navbar-sheet-handle';

type ConfirmationHeaderProps = Omit<
  HeaderStandardGlassProps,
  'isGlass' | 'isFloating'
> & {
  isSheetPresentation?: boolean;
};

/** In-flow confirmation header with glass buttons behind `glassHeaders`. */
export function ConfirmationHeader({
  isSheetPresentation = false,
  ...props
}: ConfirmationHeaderProps) {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  // Sheets stay plain app-wide, so sheet-presented confirmations do too.
  return (
    <HeaderStandardGlass
      {...props}
      isGlass={isGlassHeader && !isSheetPresentation}
      isFloating={false}
    />
  );
}

/**
 * HeaderBase's top inset is a margin, so the header background starts below
 * it and the screen behind shows through. Padding keeps the title below the
 * notch and paints that band with the screen background.
 */
function FullScreenNavbarBackground({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.background.default,
        paddingTop: insets.top,
      }}
    >
      {children}
    </View>
  );
}

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
        <ConfirmationHeader
          isSheetPresentation={isSheetPresentation}
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
          includesTopInset={false}
          twClassName="bg-default"
        >
          {customTitle}
        </ConfirmationHeader>
      );

      if (!isSheetPresentation) {
        return (
          <FullScreenNavbarBackground>{header}</FullScreenNavbarBackground>
        );
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
