import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    bottomSheet: {
      backgroundColor: colors.background.alternative,
    },
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.background.alternative,
    },
    header: {
      paddingBottom: 8,
      backgroundColor: colors.background.alternative,
    },
    footer: {
      backgroundColor: colors.background.alternative,
      paddingBottom: 8,
    },
    priceInfoContainer: {
      marginTop: 16,
      marginBottom: 32,
      gap: 8,
    },
    priceInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    inputContainerLeft: {
      marginRight: 4,
    },
    inputContainerRight: {
      marginLeft: 4,
    },
    inputContainerActive: {
      borderColor: colors.primary.default,
    },
    inputContainerError: {
      borderColor: colors.error.default,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      paddingVertical: 0,
      textAlign: 'left',
      marginRight: 8,
    },

    percentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 8,
    },
    percentageButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background.pressed,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    percentageButtonOff: {
      backgroundColor: colors.background.pressed,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    percentageButtonActiveTP: {
      borderWidth: 1,
      borderColor: colors.success.default,
    },
    percentageButtonActiveSL: {
      borderWidth: 1,
      borderColor: colors.error.default,
    },
    helperText: {
      marginTop: 4,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay.default,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingContainer: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    loadingText: {
      marginTop: 12,
    },
  });
