/* eslint-disable import/prefer-default-export */
import { Platform, StyleSheet, TextStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { getFontFamily } from '../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

const createStyles = (
  colors: Theme['colors'],
  typography: Theme['typography'],
) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
    },
    topOverlay: {
      flex: 1,
    },
    wrapper: {
      flexGrow: 1,
    },
    scanPkeyRow: {
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    descriptionContainer: {
      marginTop: 4,
    },
    bottom: {
      width: '100%',
      paddingHorizontal: 16,
    },
    input: {
      height: 120,
      backgroundColor: colors.background.section,
      alignItems: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
      color: colors.text.default,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      fontWeight: typography.sBodyMD.fontWeight as TextStyle['fontWeight'],
      fontSize: typography.sBodyMD.fontSize,
      letterSpacing: typography.sBodyMD.letterSpacing,
      lineHeight: Platform.OS === 'ios' ? 20 : 22,
      textAlignVertical: 'top',
    },
  });

export { createStyles };
