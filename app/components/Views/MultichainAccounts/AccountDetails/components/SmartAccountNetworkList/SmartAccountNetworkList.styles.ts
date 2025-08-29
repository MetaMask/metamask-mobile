import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const createStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    networkList: {
      marginBottom: 8,
    },
  });
};

export default createStyles;
