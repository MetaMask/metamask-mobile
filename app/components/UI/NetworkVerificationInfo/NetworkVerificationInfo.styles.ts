import { StyleSheet } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import scaling from '../../../util/scaling';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    accountCardWrapper: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginVertical: 16,
    },

    textSection: {
      marginBottom: 8,
    },
    alertBar: {
      width: '100%',
      marginBottom: 15,
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(18),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 10,
      paddingHorizontal: 16,
    },
    bottomSpace: {
      marginBottom: 10,
    },
    textContainer: {
      paddingHorizontal: 16,
      marginVertical: 10,
    },
    warningContainer: {
      marginTop: 20,
      marginHorizontal: 4,
    },
    errorContinue: {
      marginVertical: 16,
    },
    textCentred: {
      textAlign: 'center',
    },
    boldText: {
      ...fontStyles.bold,
    },
    networkSection: { marginBottom: 16 },
    nestedScrollContent: { paddingBottom: 24 },
  });
};
export default styleSheet;
