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
      padding: 16,
      paddingBottom: 32,
    },
    section: {
      marginBottom: 24,
    },
    heading: {
      marginBottom: 12,
    },
    description: {
      color: colors.text.alternative,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    userDataBox: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    userDataRow: {
      marginBottom: 8,
    },
    supportNotice: {
      color: colors.text.alternative,
      fontStyle: 'italic',
    },
    checkboxSpacing: {
      height: 16,
    },
    button: {
      marginTop: 8,
    },
    errorBanner: {
      marginBottom: 16,
    },
    poweredBy: {
      marginTop: 24,
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
