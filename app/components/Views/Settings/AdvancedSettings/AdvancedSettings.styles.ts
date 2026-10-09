import { StyleSheet } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { getFontFamily } from '../../../../component-library/components/Texts/Text/Text.utils';
import { TextVariant } from '../../../../component-library/components/Texts/Text/Text.types';
import type { Colors } from '../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 16,
      paddingBottom: 100,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    setting: {
      marginTop: 24,
    },
    firstSetting: {
      marginTop: 0,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 20,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    inner: {
      paddingBottom: 48,
    },
    ipfsGatewayLoadingWrapper: {
      height: 37,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: colors.error.muted,
      borderLeftColor: colors.error.default,
      borderRadius: 4,
      borderLeftWidth: 4,
      marginTop: 24,
      marginHorizontal: 8,
      paddingStart: 11,
      paddingEnd: 8,
      paddingVertical: 8,
    },
    warningText: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.default,
      flex: 1,
      marginStart: 8,
    },
  });

export type AdvancedSettingsStyles = ReturnType<typeof createStyles>;
