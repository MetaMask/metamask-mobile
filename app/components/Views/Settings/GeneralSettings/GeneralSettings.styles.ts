import { StyleSheet } from 'react-native';
import { colors as staticColors } from '../../../../styles/common';
import type { Colors } from '../../../../util/theme/models';

export const AVATAR_DIAMETER = 40;

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      padding: 16,
      flex: 1,
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
    inner: {
      paddingBottom: 100,
    },
    identiconContainer: {
      flexDirection: 'row',
    },
    identiconRow: {
      width: '33%',
      alignItems: 'center',
      flexDirection: 'column',
    },
    identiconText: {
      marginTop: 12,
    },
    avatarWrapper: {
      borderRadius: 12,
      width: AVATAR_DIAMETER + 4,
      height: AVATAR_DIAMETER + 4,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedAvatarWrapper: {
      borderColor: colors.primary.default,
    },
    unselectedAvatarWrapper: {
      borderColor: staticColors.transparent,
    },
  });

export type GeneralSettingsStyles = ReturnType<typeof createStyles>;
