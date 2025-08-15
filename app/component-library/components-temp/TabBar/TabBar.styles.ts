// Third party dependencies.
import { TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';
import { getFontFamily } from '../../components/Texts/Text';
import { TextVariant } from '../../components/Texts/Text/Text.types';

/**
 * Style sheet function for TabBar component
 *
 * @param params Style sheet params
 * @param params.theme Theme object
 * @returns StyleSheet object
 */
const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors, typography },
  } = params;

  return {
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.icon.default,
    },
    tabStyle: {
      paddingBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 32,
    },
    tabBar: {
      borderColor: colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMD, '500'),
    },
  };
};

export default styleSheet;
