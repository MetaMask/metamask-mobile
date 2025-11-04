import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    emptyList: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
    },
    emptyListText: {
      color: colors.text.muted,
    },
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    scrollViewContent: {
      flex: 1,
      justifyContent: 'flex-end',
    },
  });
};

export default styleSheet;
