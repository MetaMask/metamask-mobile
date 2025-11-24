import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
    },
    title: {
      marginBottom: 16,
    },
    contentMain: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: params.theme.colors.background.section,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    rightPad: {
      paddingRight: 3,
    },
  });

export default styleSheet;
