import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: colors.background.default,
    },
    perpIcon: {
      width: 32,
      height: 32,
      marginRight: 16,
      marginLeft: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tokenVolume: {
      marginTop: 2,
    },
    rightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    priceInfo: {
      alignItems: 'flex-end',
    },
    price: {
      marginBottom: 2,
    },
    priceChange: {
      marginTop: 2,
    },
    leverageContainer: {
      backgroundColor: colors.background.muted,
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderRadius: 2,
    },
    networkAvatar: {
      marginRight: 16,
    },
  });
};

export default styleSheet;
