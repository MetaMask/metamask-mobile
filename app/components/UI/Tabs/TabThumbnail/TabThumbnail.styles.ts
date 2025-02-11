import { StyleSheet, Dimensions } from 'react-native';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import Device from '../../../../util/device';
import type { ThemeColors } from '@metamask/design-tokens';

const margin = 15;
const width = Dimensions.get('window').width - margin * 2;
const height = Dimensions.get('window').height / (Device.isIphone5S() ? 4 : 5);
let paddingTop = Dimensions.get('window').height - 190;
paddingTop -= 100;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabFavicon: {
      width: 22,
      height: 22,
      marginRight: 5,
      marginLeft: 2,
      marginTop: 1,
    },
    tabSiteName: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 18,
      marginRight: 40,
      marginLeft: 5,
      marginTop: 0,
    },
    tabHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      padding: 8,
    },
    tabWrapper: {
      marginBottom: 15,
      borderRadius: 10,
      elevation: 8,
      justifyContent: 'space-evenly',
      overflow: 'hidden',
      borderColor: colors.border.default,
      borderWidth: 1,
      width,
      height,
    },
    checkWrapper: {
      backgroundColor: importedColors.transparent,
      overflow: 'hidden',
    },
    tab: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    tabImage: {
      ...StyleSheet.absoluteFillObject,
      paddingTop,
      resizeMode: 'cover',
    },
    activeTab: {
      borderWidth: 5,
      borderColor: colors.primary.default,
    },
    closeTabIcon: {
      paddingHorizontal: 10,
      paddingTop: 3,
      fontSize: 32,
      color: colors.text.default,
      right: 0,
      marginBottom: 7,
      position: 'absolute',
    },
    titleButton: {
      backgroundColor: importedColors.transparent,
      flex: 1,
      flexDirection: 'row',
      marginRight: 40,
    },
    closeTabButton: {
      backgroundColor: importedColors.transparent,
      width: Device.isIos() ? 30 : 35,
      height: 24,
    },
    footerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 36,
      backgroundColor: colors.background.default,
      borderTopColor: colors.border.default,
      borderTopWidth: 1,
      padding: 8,
    },
    footerText: {
      flex: 1,
    },
    badgeWrapperContainer: {
      paddingRight: 8,
    },
  });

export default createStyles;
