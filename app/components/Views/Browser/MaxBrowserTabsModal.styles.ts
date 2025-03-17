import { StyleSheet } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    sheet: {
      paddingHorizontal: 20
    },
    infoIconWrap: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8
    },
    infoIcon: {
      color: colors.primary.default,
    },
    dialogDescription: {
      marginBottom: 20,
    },
  });
};

export default styleSheet;
