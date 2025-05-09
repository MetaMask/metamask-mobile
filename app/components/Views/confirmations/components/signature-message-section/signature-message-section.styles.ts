import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';
import { fontStyles } from '../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      width: '100%',
    },
    message: {
      marginTop: 8,
    },
    title: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
    },
    description: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
    messageContainer: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      minHeight: 200,
      maxHeight: 300,
    },
    scrollableSection: {
      padding: 16,
    },
    messageExpanded: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
    copyButtonContainer: {
      position: 'absolute',
      top: -40,
      right: 0,
    },
  });
};

export default styleSheet;
