import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    message: {
      color: params.theme.colors.text.default,
    },
    detailsBlock: {
      marginTop: 6,
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: params.theme.colors.background.alternative,
      borderRadius: 4,
    },
    detailRow: {
      color: params.theme.colors.text.alternative,
    },
  });

export default styleSheet;
