import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    assetIconWrapper: {
      alignSelf: 'center',
    },
    hyperliquidIcon: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: theme.colors.background.section,
      borderWidth: 0,
    },
    skeletonAvatar: {
      borderRadius: 20,
    },
    skeletonButton: {
      borderRadius: 8,
    },
    skeletonBalanceValue: {
      marginBottom: 4,
    },
  });

export default styleSheet;
