import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography, colors } = theme;
  return StyleSheet.create({
    wrapper: {
      marginTop: 20,
    },
    contentWrapper: {
      paddingVertical: 4,
    },
    title: {
      ...typography.sHeadingSM,
      marginVertical: 0,
      paddingVertical: 8,
    } as TextStyle,
    icon: { marginLeft: 4 },
    listWrapper: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    listItemStacked: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    firstChild: {
      paddingTop: 0,
    },
    lastChild: {
      paddingBottom: 0,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      marginLeft: 8,
    },
  });
};

export default styleSheet;
