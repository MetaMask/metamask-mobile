///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    avatar: {
      backgroundColor: colors.background.alternativeHover,
    },
    fallbackAvatar: {
      backgroundColor: colors.background.alternativeHover,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colors.text.alternative,
    },
    fallbackAvatarText: {
      textTransform: 'uppercase',
    },
    badge: {
      backgroundColor: colors.info.default,
      color: colors.info.inverse,
      borderColor: colors.background.alternative,
      borderWidth: 2,
    },
  });
};

export default styleSheet;
///: END:ONLY_INCLUDE_IF
