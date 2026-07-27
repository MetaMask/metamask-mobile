import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    currentSetupSection: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    box: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 12,
      backgroundColor: theme.colors.background.alternative,
      maxHeight: 140,
      marginTop: 8,
    },
    boxScroll: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    item: {
      paddingVertical: 4,
    },
    emptyState: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    selectedRow: {
      paddingVertical: 8,
    },
    selectedRowLabel: {
      marginBottom: 2,
    },
    configurationSection: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      overflow: 'hidden',
    },
    configurationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 76,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    configurationRowPressed: {
      backgroundColor: theme.colors.background.muted,
    },
    configurationRowDisabled: {
      opacity: 0.5,
    },
    configurationRowContent: {
      flex: 1,
      paddingRight: 12,
    },
    configurationRowValue: {
      marginTop: 2,
      marginBottom: 2,
    },
    selectableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    selectableRowSelected: {
      backgroundColor: theme.colors.background.muted,
    },
    selectableRowLabel: {
      flex: 1,
      paddingRight: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 16,
    },
    summarySection: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 12,
      backgroundColor: theme.colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    summaryTitle: {
      marginBottom: 8,
    },
    summaryRow: {
      paddingVertical: 6,
    },
    summaryRowLabel: {
      marginBottom: 2,
    },
    amountSection: {
      marginBottom: 16,
    },
    amountLabel: {
      marginBottom: 8,
    },
    amountInput: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 12,
      height: 56,
      paddingHorizontal: 16,
      paddingVertical: 0,
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.text.default,
      backgroundColor: theme.colors.background.alternative,
    },
    actionsRow: {
      marginBottom: 20,
    },
    getQuotesButton: {
      width: '100%',
    },
    actionsHint: {
      marginTop: 8,
    },
    eventLogSection: {
      marginTop: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.background.alternative,
    },
    eventLogTitle: {
      marginBottom: 6,
    },
    eventLogLine: {
      marginTop: 2,
    },
    quoteRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    quoteRowHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    quoteBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    quoteBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: theme.colors.background.alternative,
      marginLeft: 4,
    },
    quoteBadgeAccent: {
      backgroundColor: theme.colors.primary.muted,
    },
    quoteRowDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 2,
    },
    quoteRowDetailLabel: {
      paddingRight: 8,
    },
    quoteRowDetailValue: {
      flexShrink: 1,
      textAlign: 'right',
    },
    quoteRowAction: {
      marginTop: 8,
    },
    quoteErrors: {
      paddingTop: 8,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
    },
    quoteErrorsTitle: {
      marginBottom: 4,
    },
    headlessSection: {
      marginTop: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      padding: 16,
    },
    headlessSectionBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: theme.colors.warning.default,
      marginBottom: 8,
    },
    headlessSectionTitle: {
      marginBottom: 8,
    },
    headlessSectionWarning: {
      marginBottom: 16,
    },
    headlessParamsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 12,
      backgroundColor: theme.colors.background.default,
      marginBottom: 16,
      overflow: 'hidden',
    },
    sandboxParamRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    sandboxParamRowLast: {
      borderBottomWidth: 0,
    },
    sandboxParamHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
      gap: 8,
    },
    sandboxParamReset: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 0,
    },
    pickerSheetContent: {
      paddingBottom: 24,
    },
    pickerSheetList: {
      paddingBottom: 8,
    },
  });
};

export default styleSheet;
