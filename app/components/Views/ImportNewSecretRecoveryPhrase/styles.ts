/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    topOverlay: {
      flex: 1,
    },
    wrapper: {
      flexGrow: 1,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      marginTop: 20,
      marginBottom: 40,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
    },
    grid: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    },
    gridCell: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      width: '30%',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    gridCellPrefix: {
      color: colors.text.alternative,
    },
    input: {
      width: '100%',
    },
    subheading: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    options: {
      display: 'flex',
      flexGrow: 1,
      marginLeft: -15,
    },
    footer: {
      display: 'flex',
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    footerText: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    dataRow: {
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    subtitleText: {
      fontSize: 18,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    icon: {
      textAlign: 'left',
      fontSize: 50,
      marginTop: 0,
      marginLeft: 0,
      color: colors.icon.alternative,
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      marginBottom: 16,
      backgroundColor: colors.background.default,
    },
    button: {
      marginBottom: Device.isIphoneX() ? 20 : 0,
    },
    top: {
      paddingTop: 0,
      padding: 30,
    },
    bottom: {
      width: '100%',
      padding: 30,
      backgroundColor: colors.background.default,
    },
    navbarLeftButton: {
      alignSelf: 'flex-start',
      paddingTop: 20,
      paddingBottom: 10,
      marginTop: Device.isIphoneX() ? 40 : 20,
    },
    closeIcon: {
      fontSize: 28,
      color: colors.text.default,
    },
  });

export { createStyles };
