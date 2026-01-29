import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors as importedColors } from '../../../../../../styles/common';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  default as MorphText,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Device from '../../../../../../util/device';
import { Theme } from '../../../../../../util/theme/models';

/**
 * Optional overrides for navbar customization.
 * Each property mirrors the return value of getNavbar.
 */
export interface NavbarOverrides {
  headerTitle?: () => ReactNode;
  /** Custom header left component. Receives onBackPress for rejection handling. */
  headerLeft?: (onBackPress: () => void) => ReactNode;
  /** Additional styles to merge with header */
  headerStyle?: ViewStyle;
  headerTitleAlign?: 'left' | 'center';
}

export interface NavbarOptions {
  title: string;
  onReject?: () => void;
  addBackButton?: boolean;
  theme: Theme;
  overrides?: NavbarOverrides;
}

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
  theme,
  overrides,
}: NavbarOptions) {
  const innerStyles = StyleSheet.create({
    headerLeft: {
      marginHorizontal: 16,
      display: addBackButton ? undefined : 'none',
    },
    headerTitle: {
      alignItems: 'center',
      marginRight: Device.isAndroid() ? 60 : undefined,
    },
    headerStyle: {
      backgroundColor: theme.colors.background.alternative,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });

  function handleBackPress() {
    if (onReject) {
      onReject();
    }
  }

  const defaultHeaderTitle = () => (
    <View style={innerStyles.headerTitle}>
      <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>
    </View>
  );

  const defaultHeaderLeft = () => (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.ArrowLeft}
      onPress={handleBackPress}
      style={innerStyles.headerLeft}
      testID={`${title}-navbar-back-button`}
    />
  );

  const customHeaderLeft = overrides?.headerLeft;

  return {
    headerTitleAlign: overrides?.headerTitleAlign ?? ('center' as const),
    headerTitle: overrides?.headerTitle ?? defaultHeaderTitle,
    headerLeft: customHeaderLeft
      ? () => customHeaderLeft(handleBackPress)
      : defaultHeaderLeft,
    headerStyle: {
      ...innerStyles.headerStyle,
      ...overrides?.headerStyle,
    },
  };
}

export function getEmptyNavHeader({ theme }: { theme: Theme }) {
  const navbarOptions = getNavbar({
    title: '',
    addBackButton: false,
    theme,
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
