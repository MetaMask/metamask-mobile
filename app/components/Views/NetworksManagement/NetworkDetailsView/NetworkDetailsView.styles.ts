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

  const baseInput = {
    ...typography.sBodyMD,
    fontWeight: typography.sBodyMD.fontWeight as '400',
    fontFamily: getFontFamily(TextVariant.BodyMD),
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    height: 48,
    color: colors.text.default,
    backgroundColor: colors.background.muted,
  };

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
      ...baseInput,
      borderColor: colors.border.muted,
    },
    inputWithError: {
      ...baseInput,
      borderColor: colors.error.default,
    },
    inputWithFocus: {
      ...baseInput,
      borderColor: colors.border.default,
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
