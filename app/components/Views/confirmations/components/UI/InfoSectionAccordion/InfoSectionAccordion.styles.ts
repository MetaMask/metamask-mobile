import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      paddingVertical: 8,
    },
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
      paddingHorizontal: 8,
      paddingVertical: 16,
    },
    headerTitle: {
      color: theme.colors.text.default,
      fontSize: 14,
      ...fontStyles.bold,
    },
    icon: {
      color: theme.colors.text.muted,
    },
    content: {},
    iconContainer: {},
  });
};

export default styleSheet;
