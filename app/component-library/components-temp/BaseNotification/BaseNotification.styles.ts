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
    },
    content: {
      padding: 16,
      flexDirection: 'row',
      flex: 1,
      borderRadius: 8,
    },
    flashLabel: {
      flex: 1,
      flexDirection: 'column',
    },
    flashText: {
      flex: 1,
      lineHeight: 18,
    },
    flashTitle: {
      flex: 1,
      marginBottom: 2,
      lineHeight: 18,
    },
    flashIcon: {
      marginRight: 15,
    },
  });
};

export default styleSheet;
