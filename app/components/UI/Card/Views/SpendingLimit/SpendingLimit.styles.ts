import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeAreaView: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
    },
    contentContainer: {
      flexGrow: 1,
      paddingTop: 16,
      paddingBottom: 16,
    },
    assetContainer: {
      marginBottom: 24,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    selectedTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    selectedTokenIcon: {
      marginRight: 12,
    },
    selectedTokenInfo: {
      flex: 1,
      marginRight: 8,
    },
    selectedTokenSymbol: {
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    selectedChainName: {
      color: theme.colors.text.alternative,
      fontSize: 12,
      marginTop: 2,
    },
    placeholderText: {
      color: theme.colors.text.alternative,
      flex: 1,
    },
    optionsContainer: {
      flex: 1,
      gap: 16,
    },
    optionCard: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
    },
    selectedOptionCard: {
      borderColor: theme.colors.primary.default,
    },
    optionItem: {
      paddingVertical: 6,
      marginBottom: 16,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.icon.muted,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonSelected: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary.default,
    },
    optionTitle: {
      flex: 1,
      color: theme.colors.text.default,
    },
    optionDescription: {
      color: theme.colors.text.alternative,
      lineHeight: 20,
    },
    editLimitButton: {
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    editLimitText: {
      color: theme.colors.primary.default,
    },
    limitInputContainer: {
      marginTop: 16,
    },
    limitInputLabel: {
      color: theme.colors.text.alternative,
      marginBottom: 8,
    },
    limitInput: {
      color: theme.colors.text.default,
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      minHeight: 48,
    },
    buttonsContainer: {
      gap: 12,
      marginTop: 24,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.warning.muted,
      borderRadius: 8,
      marginBottom: 12,
    },
    warningIcon: {
      marginRight: 8,
    },
    warningText: {
      flex: 1,
      lineHeight: 18,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

export default createStyles;
