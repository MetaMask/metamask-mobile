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
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 0,
    },
    dateHeaderText: {
      color: colors.text.alternative,
      fontSize: 14,
      fontWeight: '500',
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
