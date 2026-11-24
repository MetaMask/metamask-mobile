import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    sectionTitle: {
      marginBottom: 12,
    },
    userDataBox: {
      backgroundColor: colors.background.alternative,
      padding: 12,
      marginBottom: 12,
    },
    userDataRow: {
      marginBottom: 8,
    },
    supportNotice: {
      color: colors.text.alternative,
    },
    checkboxSpacing: {
      height: 16,
    },
    linkText: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
    },
  });
};

export default styleSheet;
