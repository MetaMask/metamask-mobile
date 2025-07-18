// app/components/UI/Stake/components/EarnTokenSelector/EarnTokenSelector.styles.ts
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export default (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      minHeight: 56,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    startAccessoryContainer: {
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '95%',
    },
    endAccessoryContainer: {
      alignItems: 'flex-end',
      maxWidth: '100%',
      minWidth: '50%',
    },
    aprText: {
      color: theme.colors.success.default,
      marginBottom: 2,
    },
    tokenText: {
      marginLeft: 8,
    },
    balanceText: {
      textAlign: 'right',
      width: '100%',
    },
    networkAvatar: {
      width: 32,
      height: 32,
    },
  });
};
