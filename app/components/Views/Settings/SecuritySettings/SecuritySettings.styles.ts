import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const createStyles = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: 16,
      paddingBottom: 48,
    },
    heading: {
      marginBottom: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    accessory: {
      marginTop: 12,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    switchElement: {
      marginLeft: 16,
    },
    blockaidSwitchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
    },
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    firstSetting: {
      marginTop: 0,
    },
    halfSetting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    groupDivider: {
      backgroundColor: colors.border.muted,
      height: 1,
    },
    transactionRow: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    transactionFirstRow: {
      paddingTop: 8,
    },
    transactionContent: {
      flex: 1,
    },
    sectionBreak: {
      backgroundColor: colors.background.muted,
      height: 6,
      marginHorizontal: -16,
    },
    transactionHeaderBreak: {
      height: 0,
    },
    sheetContent: {
      paddingBottom: 24,
      paddingHorizontal: 16,
    },
    sheetText: {
      lineHeight: 20,
      marginBottom: 16,
    },
    sheetSecondaryAction: {
      marginBottom: 12,
    },
    destructiveSheetContent: {
      alignItems: 'stretch',
      paddingBottom: 24,
      paddingHorizontal: 16,
      paddingTop: 40,
      rowGap: 16,
    },
    destructiveSheetIcon: {
      alignSelf: 'center',
      marginBottom: 8,
    },
    destructiveSheetTitle: {
      textAlign: 'center',
    },
    destructiveSheetText: {
      lineHeight: 24,
      marginBottom: 8,
    },
    sheetOptionsContent: {
      maxHeight: 420,
    },
    sheetOptionsList: {
      paddingBottom: 24,
    },
    optionButton: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 48,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    optionButtonSelected: {
      backgroundColor: colors.background.muted,
    },
    optionLabel: {
      flex: 1,
    },
    optionIcon: {
      paddingLeft: 16,
    },
    protect: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    col: {
      width: '48%',
    },
    inner: {
      paddingBottom: 112,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switch: {
      alignSelf: 'flex-start',
    },
  });

export default createStyles;
