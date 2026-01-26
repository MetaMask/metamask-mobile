import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    sectionDescription: {
      marginBottom: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: 16,
      color: colors.text.default,
    },
    suffix: {
      marginLeft: 4,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    privacyOption: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    privacyOptionSelected: {
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.muted,
    },
    privacyOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    privacyOptionDescription: {
      marginLeft: 28,
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border.default,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      borderColor: colors.primary.default,
    },
    radioButtonInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary.default,
    },
    buttonsContainer: {
      padding: 24,
      gap: 12,
    },
  });
};

export default styleSheet;
