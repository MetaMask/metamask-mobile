import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const marginWidth = 16;
const notificationWidth = Dimensions.get('window').width - marginWidth * 2;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    base: {
      position: 'absolute',
      top: 0,
      left: marginWidth,
      width: notificationWidth,
      backgroundColor: colors.background.section,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    baseWithCloseIconButton: {
      paddingRight: 8,
    },
    pressableContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    flashIcon: {
      marginRight: 15,
    },
    flashLabel: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    flashTitle: {
      color: colors.text.default,
      marginBottom: 2,
      lineHeight: 18,
    },
    flashText: {
      flex: 1,
      lineHeight: 18,
      color: colors.text.default,
    },
  });
};

export default styleSheet;
