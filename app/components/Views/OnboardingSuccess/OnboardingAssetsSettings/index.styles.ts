// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for PickerAccount component.
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
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: 16,
    },
    backButtonContainer: {
      marginLeft: 6,
    },
    setting: {
      marginTop: 32,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    desc: {
      marginTop: 8,
    },
    halfSetting: {
      marginTop: 16,
    },
    switchElement: {
      marginLeft: 16,
    },
    accessory: {
      marginTop: 16,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    transactionsContainer: {
      marginTop: 24,
      marginLeft: -16,
      marginRight: -16,
    },
    cellBorder: {
      borderWidth: 0,
    },
    contentContainerStyle: {
      paddingBottom: 75,
    },
  });
};

export default styleSheet;
