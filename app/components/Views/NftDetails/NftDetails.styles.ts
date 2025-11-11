import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    infoContainer: {
      padding: 16,
    },
    nameWrapper: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    collectibleMediaWrapper: {
      paddingTop: 16,
      paddingBottom: 40,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    collectibleMediaStyle: {
      alignItems: 'center',
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 97,
      width: 180,
      height: 180,
    },
    iconVerified: {
      color: colors.primary.default,
      paddingTop: 18,
      marginLeft: 4,
    },
    generalInfoFrame: {
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },
    heading: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 20,
      lineHeight: 24,
      paddingTop: 16,
    },
    generalInfoValueStyle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disclaimerText: {
      color: colors.text.alternative,
    },
    disclaimer: {
      paddingTop: 16,
    },
    description: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 12,
      ...fontStyles.normal,
      lineHeight: 20,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      padding: 16,
    },
    buttonSendWrapper: {
      flexDirection: 'row',
      paddingTop: 16,
      paddingRight: 16,
      paddingLeft: 16,
    },
    generalInfoTitleStyle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    generalInfoTitleTextStyle: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      ...fontStyles.medium,
      lineHeight: 16,
      fontSize: 10,
    },
    informationRowTitleStyle: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      ...fontStyles.medium,
      lineHeight: 22,
      fontSize: 14,
    },
    informationRowValueStyle: {
      color: colors.text.default,
      ...fontStyles.normal,
      ...fontStyles.normal,
      lineHeight: 22,
      fontSize: 14,
    },
    informationRowValueAddressStyle: {
      color: colors.primary.default,
      ...fontStyles.normal,
      ...fontStyles.medium,
      lineHeight: 20,
      fontSize: 12,
    },
    iconExport: {
      color: colors.text.alternative,
      paddingLeft: 16,
    },
    generalInfoValueTextStyle: {
      color: colors.text.default,
      ...fontStyles.normal,
      ...fontStyles.bold,
      lineHeight: 24,
      fontSize: 16,
    },
    generalInfoValueTextAddressStyle: {
      color: colors.primary.default,
      ...fontStyles.normal,
      ...fontStyles.medium,
      lineHeight: 20,
      fontSize: 12,
    },
    buttonSend: {
      flexGrow: 1,
    },
    fullImageContainer: {
      position: 'relative',
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullImageItem: {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: 16,
    },
    iconPadding: {
      paddingLeft: 8,
    },
  });
};
export default styleSheet;
