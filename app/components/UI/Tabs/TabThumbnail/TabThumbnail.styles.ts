import { StyleSheet, Dimensions } from 'react-native';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import type { ThemeColors } from '@metamask/design-tokens';

// Grid layout constants - must match Tabs/index.js
const GRID_GAP = 12;
const GRID_COLUMNS = 2;
const GRID_PADDING = 16;
const width =
  (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / GRID_COLUMNS;
const height = width * 0.98; // 30% shorter than original 1.4 ratio

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabFavicon: {
      width: 16,
      height: 16,
      marginRight: 4,
      marginLeft: 2,
    },
    tabSiteName: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 12,
      marginRight: 24,
      marginLeft: 4,
      flex: 1,
    },
    tabHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      padding: 6,
    },
    tabWrapper: {
      borderRadius: 12,
      elevation: 4,
      justifyContent: 'flex-start',
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
      resizeMode: 'cover',
    },
    activeTab: {
      borderWidth: 3,
      borderColor: colors.primary.default,
    },
    closeTabIcon: {
      paddingHorizontal: 6,
      paddingTop: 2,
      fontSize: 24,
      color: colors.text.default,
      right: 0,
      marginBottom: 4,
      position: 'absolute',
    },
    titleButton: {
      backgroundColor: importedColors.transparent,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
    },
    closeTabButton: {
      backgroundColor: importedColors.transparent,
      width: 24,
      height: 20,
    },
    footerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 28,
      backgroundColor: colors.background.default,
      borderTopColor: colors.border.default,
      borderTopWidth: 1,
      padding: 6,
    },
    footerText: {
      flex: 1,
      fontSize: 10,
    },
    badgeWrapperContainer: {
      paddingRight: 6,
    },
  });

export default createStyles;
