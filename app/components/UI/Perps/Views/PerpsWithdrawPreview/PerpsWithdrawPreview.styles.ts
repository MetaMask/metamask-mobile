import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

const createStyles = ({ theme }: { theme: Theme }) => {
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    detailLabel: {
      flex: 1,
    },
    detailValue: {
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginVertical: 8,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
    },
    noticeCard: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 16,
      marginTop: 16,
    },
    noticeText: {
      lineHeight: 20,
    },
    bottomContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    confirmButton: {
      marginTop: 16,
    },
  });
};

export default createStyles;
