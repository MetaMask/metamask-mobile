import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) =>
  StyleSheet.create({
    bottomSheet: {
      borderWidth: 0,
      borderColor: params.theme.colors.background.default,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerContainer: {
      padding: 16,
      paddingBottom: 0,
    },
    closeButton: {
      alignSelf: 'flex-end',
    },
    title: {
      marginTop: 0,
      textAlign: 'left',
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 8,
    },
    rewardsTagContainer: {
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    description: {
      lineHeight: 20,
      marginBottom: 20,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      elevation: 0,
      borderTopWidth: 0,
      shadowOpacity: 0,
    },
  });

export default createStyles;
