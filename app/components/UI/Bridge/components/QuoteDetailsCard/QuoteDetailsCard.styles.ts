import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.muted,
      overflow: 'hidden',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 12,
    },
    gradientContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 30,
    },
    networkContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      maxWidth: '80%',
    },
    slippageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    disclaimerText: {
      textAlign: 'center',
    },
    strikethroughText: {
      textDecorationLine: 'line-through',
    },
    networkBadgeContainer: {
      flex: 1,
    },
    networkBadgeText: {
      flex: 1,
    },
  });

export default createStyles;
