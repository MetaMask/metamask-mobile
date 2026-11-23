import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
    },
    section: {
      marginBottom: 20,
    },
    heading: {
      marginBottom: 8,
    },
    description: {
      color: colors.text.alternative,
    },
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
    errorBanner: {
      marginBottom: 16,
    },
    footerContent: {
      gap: 8,
    },
    linkText: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
    },
  });
};

export default styleSheet;
