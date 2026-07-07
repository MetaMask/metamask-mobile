import { StyleSheet } from 'react-native';

const styleSheet = ({ theme }) => {
  const { colors } = theme;

  return StyleSheet.create({
    tabWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
      paddingHorizontal: 16,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 8,
      maxWidth: '80%',
      paddingHorizontal: 12,
    },
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    titleText: {
      color: colors.text.default,
    },
  });
};

export default styleSheet;
