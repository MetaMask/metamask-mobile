import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      paddingVertical: 16,
    },
    assetAmountContainer: {
      paddingTop: 8,
    },
    assetAmountText: {
      textAlign: 'center',
    },
    assetFiatConversionText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    networkAndTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    networkAvatar: {
      width: 24,
      height: 24,
    },
  });
};

export default styleSheet;
