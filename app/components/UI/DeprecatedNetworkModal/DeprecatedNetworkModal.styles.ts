import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    screen: { justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    notch: {
      width: 48,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 12,
      alignSelf: 'center',
      marginBottom: 16,
    },
    descriptionContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      padding: 16,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    centeredTitle: {
      fontSize: 18,
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      marginLeft: 16,
      marginRight: 16,
      marginTop: 16,
    },
  });
};

export default styleSheet;
