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
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    dateHeader: {
      color: colors.text.alternative,
      fontSize: 14,
      marginBottom: 0,
      paddingHorizontal: 0,
      paddingTop: 16,
      paddingBottom: 4,
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
