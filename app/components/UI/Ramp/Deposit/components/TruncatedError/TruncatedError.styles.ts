import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      marginBottom: 8,
      width: '100%',
    },
    textContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    errorText: {
      flex: 1,
    },
    seeMoreText: {
      textDecorationLine: 'underline',
      marginLeft: 4,
    },
  });
};

export default styleSheet;
