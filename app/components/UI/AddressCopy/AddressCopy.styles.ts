import { StyleSheet } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    address: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.muted,
      borderRadius: 20,
      paddingHorizontal: 12,
      padding: 4,
      marginLeft: 12,
    },
    icon: { marginLeft: 4 },
  });
};
export default styleSheet;
