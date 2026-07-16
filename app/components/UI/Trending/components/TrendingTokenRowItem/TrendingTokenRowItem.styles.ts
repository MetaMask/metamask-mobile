import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; embedded?: boolean }) => {
  const { theme, embedded = false } = params;
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      ...(embedded
        ? {}
        : {
            paddingTop: 8,
            paddingBottom: 8,
          }),
      gap: 16,
    },
    badge: {
      borderRadius: 16,
    },
    leftContainer: {
      flex: 1,
    },
    tokenHeaderRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    tokenName: {
      flexShrink: 1,
    },
    rightContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      gap: 2,
      alignSelf: 'stretch',
    },
    stockBadgeWrapper: {
      marginTop: 4,
    },
    quickTradeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.background.muted,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
