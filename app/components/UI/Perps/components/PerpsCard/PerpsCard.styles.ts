import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { iconSize: number } }) => {
  const { iconSize } = params.vars;

  return StyleSheet.create({
    card: {
      paddingVertical: 16,
    },
    cardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    assetIcon: {
      width: iconSize,
      height: iconSize,
      borderRadius: iconSize / 2,
      marginRight: 12,
    },
    cardInfo: {
      flex: 1,
    },
    cardRight: {
      alignItems: 'flex-end',
    },
  });
};

export default styleSheet;
