// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

import { DEFAULT_BADGENOTIFICATIONS_NOTIFICATIONSICON_SIZE } from './BadgeNotifications.constants';
import { BadgeNotificationsStyleSheetVars } from './BadgeNotifications.types';

/**
 * Style sheet function for BadgeNotifications component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BadgeNotificationsStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, containerSize } = vars;
  let scaleRatio = 1;
  let opacity = 0;
  if (containerSize) {
    scaleRatio =
      containerSize.height /
      Number(DEFAULT_BADGENOTIFICATIONS_NOTIFICATIONSICON_SIZE);
    opacity = 1;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: '50%',
        aspectRatio: 1,
        minHeight: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: params.theme.colors.info.default,
        borderColor: params.theme.colors.background.default,
        borderWidth: 1,
        borderRadius: 9,
        opacity,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    notificationIcon: {
      transform: [{ scale: scaleRatio }],
    },
  });
};

export default styleSheet;
