import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';

export const createStyles = (colors: {
  background: { default: string };
  text: { default: string; alternative: string };
  primary: { default: string };
  border: { muted: string };
}) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapperContent: {
      paddingLeft: 24,
      paddingRight: 24,
      paddingVertical: 24,
    },
    title: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    link: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.primary.default,
    },
    division: {
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
      width: '30%',
      marginBottom: 20,
    },
    image: {
      width: 100,
      height: 100,
    },
    logoWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
      top: 20,
      marginBottom: 40,
    },
    versionInfo: {
      marginTop: 20,
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    branchInfo: {
      fontSize: 18,
      textAlign: 'left',
      marginBottom: 20,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    links: {
      // Container for links - no specific styling needed
    },
  });
