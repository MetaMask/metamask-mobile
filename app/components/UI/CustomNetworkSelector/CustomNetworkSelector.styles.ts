import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: {
  theme: Theme;
  vars: Record<string, never>;
}) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    // custom network styles
    container: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: 100,
    },
    addNetworkButtonContainer: {
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      padding: 8,
      marginRight: 16,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    networkItem: {
      alignItems: 'center',
    },
  });
};

export default createStyles;
