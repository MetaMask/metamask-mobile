/* eslint-disable react-native/no-color-literals */
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      top: 30,
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
      top: 90,
      width: 300,
      height: 40,
      backgroundColor: '#F2F4F6',
    },
    segmentedControlItem: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    segmentedControlItemSelected: {
      position: 'absolute',
      width: 146,
      backgroundColor: 'white',
      borderRadius: 30,
      height: 36,
      marginLeft: 2,
      marginRight: 2,
    },
    text: {
      color: 'black',
      fontWeight: '500',
    },
  });

export default createStyles;
