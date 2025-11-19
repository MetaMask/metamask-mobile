import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      paddingBottom: 20,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.default,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      maxHeight: '70%',
    },
    reportContainer: {
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    reportText: {
      fontSize: 12,
      color: colors.text.default,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      flexWrap: 'wrap',
    },
    button: {
      flex: 1,
      minWidth: 100,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary.default,
    },
    secondaryButton: {
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    primaryButtonText: {
      color: colors.primary.inverse,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.text.default,
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

export default styleSheet;

