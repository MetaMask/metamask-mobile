import { StyleSheet, TextStyle } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;

  return StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
    },
    accountCardWrapper: {
      flex: 1,
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
      textAlign: 'center',
      marginVertical: 10,
      paddingHorizontal: 16,
      ...typography.sBodyMDBold,
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    } as TextStyle,
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
      ...typography.sBodyMDBold,
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    } as TextStyle,

    networkSection: { marginBottom: 16 },
    nestedScrollContent: { paddingBottom: 24 },
    networkUrlLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tag: { height: 20 },
    tagContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    defautlUrlChangedContainer: {
      marginHorizontal: 16,
    },
    titleDefaultUrl: {
      marginBottom: 16,
      alignItems: 'center',
    },
    networkUrlMissmatchDetails: {
      marginBottom: 16,
    },
    headerStyle: {
      width: '100%',
    },
    footerPadding: {
      paddingHorizontal: 16,
    },
  });
};
export default styleSheet;
