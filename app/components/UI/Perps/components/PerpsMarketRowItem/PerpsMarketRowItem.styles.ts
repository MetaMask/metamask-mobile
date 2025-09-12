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
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    perpIcon: {
      marginRight: 16,
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
  });
};

export default styleSheet;
