import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    detailsWrapper: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    alternativeText: {
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    separatorWrapper: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
