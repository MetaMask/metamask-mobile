import { StyleSheet, TextStyle } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;

  return StyleSheet.create({
    title: {
      ...typography.sHeadingSM,
      paddingBottom: 16,
      paddingTop: 14,
      marginVertical: 0,
    } as TextStyle,
    contentMain: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
  });
};

export default styleSheet;
