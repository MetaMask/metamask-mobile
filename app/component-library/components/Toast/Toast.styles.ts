// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../../util/theme/models';

const marginWidth = 16;
const padding = 12;
const toastWidth = Dimensions.get('window').width - marginWidth * 2;

/**
 * Style sheet for Toast component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    base: {
      position: 'absolute',
      width: toastWidth,
      left: marginWidth,
      bottom: 0,
      backgroundColor: colors.background.section,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 12,
      padding,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: 16,
    },
    labelsContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    label: {
      color: colors.text.default,
    },
    description: {
      marginTop: 4,
    },
    actionButton: {
      marginTop: 8,
    },
  });
};

export default styleSheet;
