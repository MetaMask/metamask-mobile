import { typography } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import type { Theme } from '../../../../util/theme/models';

/**
 * Styles used by modal/sheet sub-views inside RpcEndpointSection
 * and BlockExplorerSection. The main form layout uses design system
 * components (Box, TextField, Label, etc.) with Tailwind classes.
 */
const createStyles = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    // ---- Modal content layout ------------------------------------------------
    rpcTitleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    listContainer: {
      alignItems: 'stretch' as const,
      paddingBottom: 16,
    },

    // ---- RpcUrlInput still uses these for the modal form ---------------------
    input: {
      ...fontStyles.normal,
      fontWeight: fontStyles.normal.fontWeight as '400',
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      height: 48,
      color: colors.text.default,
      backgroundColor: colors.background.muted,
    },
    inputWithError: {
      ...typography.sBodyMD,
      fontWeight: typography.sBodyMD.fontWeight as '400',
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderColor: colors.error.default,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      height: 48,
      color: colors.text.default,
      backgroundColor: colors.background.muted,
    },
    inputWithFocus: {
      ...typography.sBodyMD,
      fontWeight: typography.sBodyMD.fontWeight as '400',
      fontFamily: getFontFamily(TextVariant.BodyMD),
      borderColor: colors.primary.default,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      height: 48,
      color: colors.text.default,
      backgroundColor: colors.background.muted,
    },
    warningText: {
      ...fontStyles.normal,
      color: colors.error.default,
      marginTop: 4,
      paddingLeft: 2,
      paddingRight: 4,
    },
  });
};

export type NetworkDetailsStyles = ReturnType<typeof createStyles>;

export default createStyles;
