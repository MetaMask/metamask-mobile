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
      borderWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    startAccessoryContainer: {
      paddingRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    avatarWrapper: {
      alignSelf: 'center',
    },
    tokenDetails: {
      marginLeft: 16,
      flexShrink: 1,
      justifyContent: 'center',
    },
    endAccessoryContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    aprText: {
      color: theme.colors.success.default,
      marginBottom: 2,
    },
    networkAvatar: {
      width: 40,
      height: 40,
    },
  });
};
