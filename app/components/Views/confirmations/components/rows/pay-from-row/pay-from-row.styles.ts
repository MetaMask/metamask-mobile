import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingBottom: 10,
    },

    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    separator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },

    modalRoot: {
      flex: 1,
    },

    modalBody: {
      paddingTop: 8,
      paddingBottom: 16,
    },

    moneyAccountIconMd: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },

    moneyAccountIconSm: {
      width: 24,
      height: 24,
      borderRadius: 6,
    },
  });
};

export default styleSheet;
