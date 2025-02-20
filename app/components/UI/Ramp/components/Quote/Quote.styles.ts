import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    tags: {
      display: 'flex',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    fee: {
      marginLeft: 8,
    },
    buyButton: {
      marginTop: 10,
    },
    title: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoIcon: {
      marginLeft: 8,
      color: colors.icon.alternative,
    },
    data: {
      marginTop: 4,
      overflow: 'hidden',
    },
  });
};
export default styleSheet;
