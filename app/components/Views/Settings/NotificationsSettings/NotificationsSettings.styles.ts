import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: params.theme.colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    heading: {
      marginTop: 16,
    },
    accessory: {
      marginTop: 16,
    },
    setting: {
      marginVertical: 16,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    switch: {
      alignSelf: 'flex-end',
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: params.theme.colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: params.theme.colors.text.default,
    },
    loader: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: params.theme.colors.background.default,
      flex: 1,
    },
    button: {
      alignSelf: 'stretch',
      marginBottom: 48,
    },

  });

  export const styles = StyleSheet.create({
    headerLeft: {
      marginHorizontal: 16,
    },
  });

export default styleSheet;
