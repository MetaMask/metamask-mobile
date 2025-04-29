import { StyleSheet, TextStyle } from 'react-native';
import { Colors } from '../../../util/theme/models';
import { ThemeTypography } from '@metamask/design-tokens';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const createStyles = (colors: Colors, typography: ThemeTypography) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    header: {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 20,
      position: 'relative',
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    date: {
      fontSize: 14,
      color: colors.text.muted,
    },
    closeButton: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    content: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    label: {
      fontSize: 16,
      color: colors.text.default,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    value: {
      fontSize: 16,
      color: colors.text.default,
      textAlign: 'right',
    },
    linkText: {
      fontSize: 16,
      color: colors.primary.default,
      textAlign: 'right',
    },
    linkContainer: {
      flexDirection: 'row',
    },
    linkIcon: {
      marginLeft: 5,
    },
    viewDetailsButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
    },
    viewDetailsText: {
      color: colors.primary.default,
      fontSize: 16,
      marginRight: 5,
    },
    listItemStatus: {
      ...(typography.sBodyMDBold as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    },
  });

export default createStyles;
