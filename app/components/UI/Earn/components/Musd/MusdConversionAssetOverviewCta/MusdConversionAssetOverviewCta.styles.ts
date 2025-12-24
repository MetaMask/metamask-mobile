import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: colors.border.muted,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    text: {
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
      fontWeight: 600,
    },
    linkText: {
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
      color: colors.primary.default,
      fontWeight: 600,
    },
    musdIcon: {
      width: 84,
      height: 84,
    },
  });
};

export default styleSheet;
