import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    priceDisplay: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 24,
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    inputContainerActive: {
      borderColor: colors.primary.default,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      paddingVertical: 0,
    },
    inputPrefix: {
      marginRight: 8,
    },
    toggle: {
      marginLeft: 16,
    },
    percentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    percentageButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      alignItems: 'center',
    },
    percentageButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    percentageButtonDisabled: {
      opacity: 0.5,
      backgroundColor: colors.background.alternative,
    },
    helperText: {
      marginTop: 4,
    },
  });
