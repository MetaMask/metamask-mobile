import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      marginBottom: 8,
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
    expandIcon: {
      position: 'absolute',
      right: 16,
    },
  });
};

export default styleSheet;
