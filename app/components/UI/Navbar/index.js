/* eslint-disable react/display-name */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
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
});

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
