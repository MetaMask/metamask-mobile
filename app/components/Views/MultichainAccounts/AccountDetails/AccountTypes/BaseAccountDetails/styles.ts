import { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;

  const baseRowStyle = {
    display: 'flex',
    marginBottom: 2,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: colors.background.alternative,
  } as ViewStyle;

  return StyleSheet.create({
    container: {
      padding: 16,
    },

    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },

    avatar: {
      marginBottom: 32,
    },

    accountName: {
      ...baseRowStyle,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    accountAddress: {
      ...baseRowStyle,
    },
    wallet: {
      ...baseRowStyle,
      marginBottom: 16,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    text: {
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
