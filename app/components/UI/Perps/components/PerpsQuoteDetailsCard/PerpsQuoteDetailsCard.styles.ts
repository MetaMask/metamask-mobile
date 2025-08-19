import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = ({ theme }: { theme: Theme }) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginTop: 16,
    },
    quoteDetails: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    quoteRow: {
      marginVertical: 4,
    },
  });
};

export default createStyles;
