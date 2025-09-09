/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 16,
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    box: {
      marginTop: 24,
      width: '100%',
      alignItems: 'flex-end',
    },
    content: {
      flexGrow: 1,
    },
    foxImage: {
      width: 140,
      height: 140,
    },
    pageNotFoundImage: {
      width: 343,
      height: 322,
    },
    title: {
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      textAlign: 'center',
    },
    storeLink: {
      textDecorationLine: 'underline',
    },
    storeLinkPressable: {
      alignSelf: 'flex-start',
    },
    storeLinkContainer: {
      marginTop: 16,
      textAlign: 'center',
    },
    foxImageContainer: {
      alignItems: 'center',
      marginBottom: 40,
      marginTop: 72,
    },
    pageNotFoundImageContainer: {
      alignItems: 'center',
      marginBottom: 16,
      marginTop: 36,
    },
    actionButtonMargin: {
      marginBottom: 16,
    },
    checkboxContainer: {
      marginBottom: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      padding: 12,
      width: '100%',
    },
  });
};

export default styleSheet;
