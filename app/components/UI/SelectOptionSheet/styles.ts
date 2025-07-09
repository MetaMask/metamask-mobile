import { ThemeColors } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

export const ROW_HEIGHT = 56; // Increased from 35 for better touch targets

interface SelectOptionSheetStyleSheetVars {
  screenHeight: number;
}

const createStyles = (colors: ThemeColors, vars: SelectOptionSheetStyleSheetVars) => {
  const { screenHeight } = vars;
  
  return StyleSheet.create({
    dropdown: {
      flexDirection: 'row',
    },
    iconDropdown: {
      marginTop: 7,
      height: 25,
      justifyContent: 'flex-end',
      textAlign: 'right',
      marginRight: 10,
    },
    selectedOption: {
      flex: 1,
      alignSelf: 'flex-start',
      color: colors.text.default,
      fontSize: 14,
      paddingHorizontal: 15,
      paddingTop: 10,
      paddingBottom: 10,
      ...fontStyles.normal,
    },
    label: {
      textAlign: 'center',
      flex: 1,
      paddingVertical: 10,
      fontSize: 17,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    list: {
      maxHeight: screenHeight * 0.4,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    optionButton: {
      paddingHorizontal: 20, // Increased from 15
      paddingVertical: 12, // Increased from 5
      flexDirection: 'row',
      justifyContent: 'space-between', // Changed from center for better layout
      alignItems: 'center',
      height: Device.isIos() ? ROW_HEIGHT : ROW_HEIGHT, // Use consistent height
      borderBottomWidth: 0.5, // Add subtle separator
      borderBottomColor: colors.border.muted,
    },
    optionLabel: {
      flex: 1,
      fontSize: 16, // Increased from 14
      ...fontStyles.normal,
      color: colors.text.default,
      paddingVertical: 4, // Add some vertical padding
    },
    icon: {
      paddingHorizontal: 10,
    },
    listWrapper: {
      flex: 1,
      paddingBottom: 10,
    },
  });
};

export default createStyles;
