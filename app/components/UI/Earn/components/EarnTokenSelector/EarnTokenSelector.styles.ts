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
      marginRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    endAccessoryContainer: {
      alignItems: 'flex-end',
    },
    aprText: {
      color: theme.colors.success.default,
      marginBottom: 2,
    },
    tokenText: {
      marginLeft: 8,
    },
    networkAvatar: {
      width: 24,
      height: 24,
    },
  });
};
