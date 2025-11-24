import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    section: {
      marginTop: 24,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    infoCard: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    maxButton: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.primary.muted,
    },
    amountDisplay: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    impactCard: {
      backgroundColor: colors.info.muted,
      borderRadius: 8,
      padding: 16,
      gap: 12,
    },
    impactCardWarning: {
      backgroundColor: colors.warning.muted,
    },
    impactCardDanger: {
      backgroundColor: colors.error.muted,
    },
    impactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    impactTitle: {
      flex: 1,
    },
    impactRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    changeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    strikethrough: {
      textDecorationLine: 'line-through',
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 16,
    },
    warningCardDanger: {
      backgroundColor: colors.error.muted,
    },
    warningText: {
      flex: 1,
    },
    warningTextContainer: {
      flex: 1,
      gap: 4,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      backgroundColor: colors.background.default,
    },
  });
};

export default styleSheet;
