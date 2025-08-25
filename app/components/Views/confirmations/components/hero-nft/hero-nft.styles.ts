import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    noImagePlaceholder: {
      backgroundColor: theme.colors.background.alternative,
      borderColor: theme.colors.border.muted,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center',
      minWidth: 48,
      padding: 4,
    },
    touchableOpacity: {
      alignSelf: 'center',
    },
  });
};

export default styleSheet;
