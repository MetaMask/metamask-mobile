import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingVertical: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    tokenInfo: {
      flex: 1,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 12,
    },
    editButton: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
    },
    tokenIconContainer: {
      width: 32,
      height: 32,
    },
    errorText: {
      marginTop: 4,
      color: colors.error.default,
    },
  });
};

export default styleSheet;
