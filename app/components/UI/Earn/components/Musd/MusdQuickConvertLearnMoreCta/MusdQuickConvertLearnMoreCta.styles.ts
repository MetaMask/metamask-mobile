import { StyleSheet } from 'react-native';
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
      alignItems: 'center',
    },
    musdIcon: {
      width: 78,
      height: 78,
    },
    textContainer: {
      flex: 1,
      marginLeft: 12,
    },
  });
};

export default styleSheet;
