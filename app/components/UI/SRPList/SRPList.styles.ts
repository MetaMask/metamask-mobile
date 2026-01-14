// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for SRP List component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: { maxHeight: number } }) => {
  const {
    theme,
    vars: { maxHeight },
  } = params;
  const { colors } = theme;

  return StyleSheet.create({
    base: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
      margin: 8,
      maxHeight,
    },
    accountInputContainer: {
      width: '100%',
      marginBottom: 16,
    },
    accountInput: {
      display: 'flex',
      width: '100%',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderColor: colors.border.default,
    },
    srpSelectorContainer: {
      display: 'flex',
      width: '100%',
    },
    srpSelector: {
      display: 'flex',
      flexDirection: 'row',
      alignContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
    },
    srp: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    srpArrow: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerContainer: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
      gap: 16,
    },
    srpListContentContainer: {
      paddingVertical: 4,
      rowGap: 16,
    },
    flatList: {
      flexGrow: 0,
    },
  });
};

export default styleSheet;
