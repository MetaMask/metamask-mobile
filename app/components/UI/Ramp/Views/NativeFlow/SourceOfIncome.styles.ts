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
      marginBottom: 20,
    },
    description: {
      color: colors.text.alternative,
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
    title: {
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text.alternative,
    },
    footerContent: {
      gap: 12,
    },
    helperText: {
      marginBottom: 8,
    },
    caption: {
      marginTop: 4,
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
