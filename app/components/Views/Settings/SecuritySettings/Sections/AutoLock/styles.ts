import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    setting: {
      marginTop: 24,
    },
    desc: {
      marginTop: 8,
    },
    picker: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
