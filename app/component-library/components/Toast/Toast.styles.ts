import { color } from '@storybook/addon-knobs';
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { ToastStyleSheetVars } from './Toast.types';

/**
 * Style sheet function for Toast component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: ToastStyleSheetVars }) => {
  const { vars, theme } = params;
  const { colors } = theme;
  // const sizeAsNum = Number(size);
  const marginWidth = 16;
  const padding = 16;
  const toastWidth = Dimensions.get('window').width - marginWidth * 2;

  return StyleSheet.create({
    base: {
      position: 'absolute',
      width: toastWidth,
      left: marginWidth,
      bottom: marginWidth,
      backgroundColor: colors.overlay.alternative,
      borderRadius: 4,
      padding,
      flexDirection: 'row',
      // alignItems: 'center',
    },
    avatar: {
      borderWidth: 2,
      borderColor: 'white',
      marginRight: 8,
    },
    label: {
      color: colors.overlay.inverse,
    },
  });
};

export default styleSheet;
