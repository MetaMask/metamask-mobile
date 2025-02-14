import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';
import Device from '../../../../../util/device';

const styleSheet = (params: {
  theme: Theme;
}) => {
  const {
    theme,
  } = params;

  return StyleSheet.create({
    modalContainer: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
    },
    content: {
      padding: 12,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
    },
    headerContainer: {
      paddingTop: 12,
    },
    footerButton: {
      flex: 1,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    headerText: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    message:{
      textAlign: 'left',
    },
    detailsText: {
      paddingLeft: 16,
    },
    checkboxContainer: {
      marginTop: 8,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
      padding: 12,
      minHeight: 63,
    },
    checkboxLabel: {
      flex: 1,
      flexWrap: 'wrap',
      alignItems: 'flex-start',
    },
    iconWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDivider: {
      width: 8,
    },
  });
};

export default styleSheet;
