/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: { justifyContent: 'center', paddingHorizontal: 24 },
    modal: {
      backgroundColor: colors.background.default,
      alignItems: 'center',
      borderRadius: 8,
      paddingVertical: 36,
    },
    contentContainer: {
      alignItems: 'center',
    },
    optionsContainer: { flexDirection: 'row', marginTop: 14 },
    option: { alignItems: 'center', paddingHorizontal: 14 },
    optionIcon: { fontSize: 24 },
    optionLabel: {
      fontSize: 14,
      fontFamily: 'EuclidCircularB-Regular',
      color: colors.primary.default,
    },
    helpOption: { marginVertical: 12 },
    optionLabelRed: { color: colors.error.default },
    fox: { height: 44, width: 44, marginBottom: 12 },
    questionLabel: {
      fontSize: 18,
      paddingHorizontal: 30,
      fontFamily: 'EuclidCircularB-Bold',
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 26,
    },
    description: {
      fontSize: 14,
      fontFamily: 'EuclidCircularB-Regular',
      color: colors.text.alternative,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 30,
      marginBottom: 12,
      marginTop: 6,
    },
    contactLabel: {
      color: colors.primary.default,
    },
    closeButton: { position: 'absolute', right: 16, top: 16 },
  });
