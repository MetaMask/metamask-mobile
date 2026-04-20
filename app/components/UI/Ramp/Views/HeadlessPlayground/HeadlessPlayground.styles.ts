import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    section: {
      marginBottom: 8,
    },
    accordionStack: {
      marginBottom: 8,
    },
    accordionItem: {
      marginBottom: 2,
    },
    box: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
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
      paddingVertical: 6,
    },
    selectedRowLabel: {
      marginBottom: 2,
    },
    selectableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 6,
      marginVertical: 2,
    },
    selectableRowSelected: {
      backgroundColor: theme.colors.primary.muted,
    },
    selectableRowLabel: {
      flexShrink: 1,
      paddingRight: 8,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 16,
    },
    summarySection: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
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
      marginBottom: 8,
    },
    amountLabel: {
      marginBottom: 4,
    },
    amountInput: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text.default,
      backgroundColor: theme.colors.background.alternative,
    },
    actionsRow: {
      marginTop: 8,
    },
    actionsHint: {
      marginTop: 4,
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
      borderWidth: 2,
      borderColor: theme.colors.warning.default,
      borderRadius: 12,
      backgroundColor: theme.colors.warning.muted,
      padding: 12,
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
      marginBottom: 4,
    },
    headlessSectionWarning: {
      marginBottom: 12,
    },
    headlessParamsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    sandboxParamRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    sandboxParamRowLast: {
      borderBottomWidth: 0,
    },
    sandboxParamHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    sandboxParamReset: {
      paddingVertical: 4,
      paddingHorizontal: 0,
    },
  });
};

export default styleSheet;
