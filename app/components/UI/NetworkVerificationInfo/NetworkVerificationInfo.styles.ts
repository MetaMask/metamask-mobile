import { StyleSheet } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    accountCardWrapper: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginVertical: 16,
    },

    textSection: {
      marginBottom: 8,
    },

    networkSection: { marginBottom: 16 },
    nestedScrollContent: { paddingBottom: 24 },
  });
};
export default styleSheet;
