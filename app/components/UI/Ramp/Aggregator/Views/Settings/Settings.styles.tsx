import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const styles = (colors?: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    buttons: {
      flexDirection: 'row',
      columnGap: 8,
    },
    button: {
      flex: 1,
    },
    activationKeyFormBody: {
      flex: 1,
    },
    activationKeyFormContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 40,
      paddingBottom: 24,
    },
    activationKeyFormFields: {
      rowGap: 32,
    },
    activationKeyFormField: {
      marginVertical: 0,
      rowGap: 8,
    },
    activationKeyTextField: {
      height: 56,
    },
    activationKeyFormFooter: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    activationKeyFormButton: {
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: 0,
      paddingTop: 16,
      paddingBottom: 48,
    },
    inner: {
      paddingHorizontal: 16,
    },
    setting: {
      paddingVertical: 16,
    },
    settingTitle: {
      marginBottom: 8,
    },
    settingDescription: {
      lineHeight: 20,
      marginTop: 8,
    },
    settingAccessory: {
      marginTop: 16,
    },
    actionRow: {
      marginHorizontal: -16,
      minHeight: 48,
    },
    rowFlag: {
      minWidth: 32,
      textAlign: 'center',
    },
    groupDivider: {
      backgroundColor: colors?.border.muted,
      height: 1,
    },
    activationKeysHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    activationKeyList: {
      marginTop: 16,
    },
    activationKeyRow: {
      paddingVertical: 16,
    },
  });

export default styles;
