import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (theme: Theme) => {
  const { height } = Dimensions.get('window');

  const navbarTop = height * 0.05 + 20;
  const segmentedControllerTop = height * 0.05 + 70;

  return StyleSheet.create({
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayContainerColumn: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    overlay: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      position: 'absolute',
      width: '100%',
      top: navbarTop,
    },
    closeIcon: {
      position: 'absolute',
      top: 0,
      right: 15,
    },
    segmentedControlContainer: {
      position: 'absolute',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 10,
      borderRadius: 30,
      top: segmentedControllerTop,
      width: 300,
      height: 40,
      backgroundColor: theme.brandColors.grey050,
    },
    segmentedControlItem: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    segmentedControlItemSelected: {
      position: 'absolute',
      width: 146,
      backgroundColor: theme.brandColors.white,
      borderRadius: 30,
      height: 36,
      marginLeft: 2,
      marginRight: 2,
    },
    text: {
      ...theme.typography.sBodyMD,
      color: theme.colors.text.default,
    },
    selectedText: {
      ...theme.typography.sBodyMDMedium,
      color: theme.colors.primary.default,
    },
  });
};
export default createStyles;
