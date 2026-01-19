import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 48,
    },
    line: {
      borderTopWidth: 1,
      borderTopColor: params.theme.colors.border.muted,
      marginVertical: 16,
      marginHorizontal: -16,
    },
    heading: {
      marginTop: 16,
    },
    accessory: {
      marginTop: 16,
    },
    setting: {
      marginTop: 16,
    },
    productAnnouncementContainer: {
      marginTop: 16,
    },
    accountHeader: {
      marginTop: 16,
      marginLeft: -16,
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
