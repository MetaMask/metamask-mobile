import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { colors } from '../../../styles/common';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.brandColors.black['000'],
    },
    preview: {
      flex: 1,
      width: '100%',
      height: '100%',
      position: 'absolute',
      zIndex: 0,
    },
    innerView: {
      flex: 1,
    },
    closeIcon: {
      marginTop: 20,
      marginRight: 20,
      width: 40,
      alignSelf: 'flex-end',
      position: 'absolute',
      color: theme.brandColors.white['000'],
    },
    overlayContainerColumn: {
      display: 'flex',
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      position: 'absolute',
      zIndex: 1,
    },
    overlayContainerRow: {
      display: 'flex',
      flexDirection: 'row',
    },
    overlay: {
      flex: 1,
      flexBasis: 0,
      backgroundColor: colors.overlay,
    },
    frame: {
      width: 250,
      height: 250,
      alignSelf: 'center',
      justifyContent: 'center',
      margin: -4,
    },
    overlayText: {
      color: colors.overlayText,
      fontFamily: 'EuclidCircularB-Regular',
      textAlign: 'center',
      textAlignVertical: 'bottom',
      paddingBottom: 28,
      height: '100%',
    },
  });

export default createStyles;
