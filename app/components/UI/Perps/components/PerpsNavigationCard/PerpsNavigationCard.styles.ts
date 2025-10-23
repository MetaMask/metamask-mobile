import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginTop: 24,
      gap: 1, // Small gap creates separator line between grouped items
    },
    itemWrapper: {
      backgroundColor: colors.background.section,
      overflow: 'hidden',
    },
    itemFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    itemLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    listItem: {
      paddingVertical: 12,
    },
  });
};

export default styleSheet;
