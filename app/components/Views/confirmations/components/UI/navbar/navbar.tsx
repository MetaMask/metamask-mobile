import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';

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
}

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
  overrides,
}: NavbarOptions) {
  function handleBackPress() {
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
    header: () => (
      <HeaderCompactStandard
        title={title}
        onBack={addBackButton ? handleBackPress : undefined}
        backButtonProps={
          addBackButton ? { testID: `${title}-navbar-back-button` } : undefined
        }
        startAccessory={customLeft}
        endAccessory={customRight}
        style={overrides?.headerStyle}
        includesTopInset
        twClassName="bg-default"
      >
        {customTitle}
      </HeaderCompactStandard>
    ),
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
