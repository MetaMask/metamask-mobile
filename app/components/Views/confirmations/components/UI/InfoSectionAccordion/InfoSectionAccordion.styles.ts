import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 8,
    },
    headerTitle: {
      color: theme.colors.text.default,
      fontSize: 14,
      fontWeight: '500',
    },
    icon: {
      color: theme.colors.text.muted,
    },
    content: {},
    iconContainer: {},
  });
};

export default styleSheet;