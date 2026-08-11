/* eslint-disable react/display-name */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors as importedColors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import {
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';

const styles = StyleSheet.create({
  closeButton: {
    paddingHorizontal: Device.isAndroid() ? 22 : 18,
    paddingVertical: Device.isAndroid() ? 14 : 8,
  },
  metamaskNameTransparentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});

const metamask_name = require('../../../images/branding/metamask-name.png'); // eslint-disable-line

/**
 * Transparent navigation options for onboarding-style screens.
 *
 * @param {Object} themeColors - The theme colors object
 * @param {string} [backgroundColor]
 * @param {boolean} [showLogo=true]
 * @param {string} [logoColor]
 * @returns {Object} Navbar options
 */
export function getTransparentOnboardingNavbarOptions(
  themeColors,
  backgroundColor = undefined,
  showLogo = true,
  logoColor = undefined,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: backgroundColor || themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 70,
      height: 35,
      tintColor: logoColor || themeColors.text.default,
    },
  });
  return {
    headerTitle: () =>
      showLogo ? (
        <View style={styles.metamaskNameTransparentWrapper}>
          <Image
            source={metamask_name}
            style={innerStyles.metamaskName}
            resizeMethod={'auto'}
          />
        </View>
      ) : null,
    headerLeft: () => <View />,
    headerRight: () => <View />,
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Navigation options for the offline mode modal.
 *
 * @returns {Object} Navbar options with header hidden
 */
export function getOfflineModalNavbar() {
  return {
    headerShown: false,
  };
}

/**
 * Navigation options for the Edit Account Name screen.
 *
 * @param {Function} goBack
 * @param {Object} themeColors
 * @returns {Object} Navbar options
 */
export const getEditAccountNameNavBarOptions = (goBack, themeColors) => {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerTitleStyle: {
      fontSize: 18,
      ...fontStyles.normal,
      color: themeColors.text.default,
    },
  });

  return {
    headerTitle: <Text>{strings('account_actions.edit_name')}</Text>,
    headerLeft: null,
    headerRight: () => (
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Lg}
        onPress={goBack}
        style={styles.closeButton}
      />
    ),
    ...innerStyles,
  };
};
