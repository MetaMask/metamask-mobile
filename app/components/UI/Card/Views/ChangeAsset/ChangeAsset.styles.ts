import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    assetContainer: {
      marginBottom: 24,
    },
    optionsContainer: {
      flex: 1,
      gap: 16,
    },
    tokenIcon: {
      marginRight: 12,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenNetwork: {
      color: theme.colors.text.alternative,
      marginTop: 2,
    },
    dropdownIcon: {
      marginLeft: 8,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    sectionDescription: {
      color: theme.colors.text.alternative,
      marginBottom: 12,
    },
    editLimitText: {
      color: theme.colors.primary.default,
    },
    editLimitButton: {
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    optionCard: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    selectedOptionCard: {
      borderColor: theme.colors.primary.default,
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
    limitInputContainer: {
      marginTop: 16,
    },
    limitInputLabel: {
      color: theme.colors.text.alternative,
      marginBottom: 8,
    },
    limitInput: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.text.default,
      backgroundColor: theme.colors.background.default,
    },
    statusText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
      marginVertical: 16,
    },
    warningText: {
      textAlign: 'center',
      color: theme.colors.error.default,
      marginVertical: 16,
    },
    successText: {
      textAlign: 'center',
      color: theme.colors.success.default,
      marginVertical: 16,
    },
    buttonsContainer: {
      gap: 12,
      marginTop: 24,
    },
    optionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    radioButtonContainer: {
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
    limitInputContainer: {
      marginTop: 16,
    },
    limitInputLabel: {
      color: theme.colors.text.alternative,
      marginBottom: 8,
    },
    limitInput: {
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.text.default,
      backgroundColor: theme.colors.background.default,
    },
    fullAccessOptionCard: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    fullAccessOptionCardSelected: {
      borderColor: theme.colors.primary.default,
    },
    restrictedOptionCard: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    restrictedOptionCardSelected: {
      borderColor: theme.colors.primary.default,
    },
  });

export default createStyles;
