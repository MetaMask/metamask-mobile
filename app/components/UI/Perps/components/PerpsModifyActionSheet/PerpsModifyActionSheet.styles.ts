import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },
    actionItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    actionIconContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    iconColor: {
      color: colors.icon.default,
    },
    actionTextContainer: {
      flex: 1,
    },
  });
};

export default styleSheet;
