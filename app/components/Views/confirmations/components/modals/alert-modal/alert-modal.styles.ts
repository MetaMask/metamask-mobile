import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      padding: 16,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
    },
    headerContainer: {
      paddingTop: 16,
    },
    footerButton: {
      flex: 1,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    headerText: {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    message: {
      textAlign: 'left',
    },
    detailsText: {
      paddingLeft: 16,
    },
    checkboxContainer: {
      marginTop: 12,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
      padding: 16,
      flexDirection: 'row',
    },
    iconWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDivider: {
      width: 8,
    },
    checkboxText: {
      marginLeft: 8,
      flex: 1,
      color: theme.colors.text.default,
    },
  });
};

export default styleSheet;
