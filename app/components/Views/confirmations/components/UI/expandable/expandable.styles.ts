import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme, vars: { isCompact: boolean | undefined } }) => {
  const { theme, vars } = params;
  const { isCompact } = vars;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isCompact ? 0 : 16,
      marginBottom: isCompact ? 0 : 8,
    },
    modalContent: {
      backgroundColor: theme.colors.background.alternative,
      paddingTop: 24,
      paddingBottom: 34,
      paddingHorizontal: 16,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    modalHeader: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 16,
    },
    expandedContentTitle: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      width: '90%',
      textAlign: 'center',
    },
  });
};

export default styleSheet;
