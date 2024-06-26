/* eslint-disable react-native/no-color-literals */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { colors } from '../../../styles/common';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      backgroundColor: theme.brandColors.black,
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
      backgroundColor: 'red',
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
      flexDirection: 'column',
      display: 'flex',
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
      position: 'absolute',
      fontFamily: 'EuclidCircularB-Regular',
      textAlign: 'center',
      textAlignVertical: 'bottom',
      paddingBottom: 28,
      width: '100%',
      top: -45,
    },
  });

export default createStyles;
