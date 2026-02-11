import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

interface RegionSelectorModalStyleSheetVars {
  screenHeight: number;
}

const createStyles = (params: {
  theme: Theme;
  vars: RegionSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    searchContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    listContainerOuter: {
      height: screenHeight * 0.8,
      overflow: 'hidden', // Hides off-screen list
    },
    listContainerInner: {
      flexDirection: 'row',
      width: '200%', // Twice the width to hold both panels
      height: '100%',
    },
    listPanel: {
      width: '50%', // Each panel takes half of the inner container
      height: '100%',
    },
    list: {
      flex: 1,
    },
    region: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      paddingRight: 16,
    },
    emptyList: {
      padding: 16,
      alignItems: 'center',
    },
    description: {
      paddingHorizontal: 16,
      marginBottom: 16,
      textAlign: 'center',
    },
  });
};

export default createStyles;
