import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.background.section,
    },
    heading: {
      paddingBottom: 4,
    },
    body: {
      textAlign: 'center',
      paddingBottom: 16,
    },
  });
};

export default styleSheet;
