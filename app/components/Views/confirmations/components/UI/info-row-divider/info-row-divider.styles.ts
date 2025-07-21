import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    infoRowDivider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 8,
      marginLeft: -8,
      marginRight: -8,
    },
  });
};

export default styleSheet;
