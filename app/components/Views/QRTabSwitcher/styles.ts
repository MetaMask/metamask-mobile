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
      right: 10,
    },
    segmentedControlContainer: {
      position: 'absolute',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 10,
      marginVertical: 10,
      borderRadius: 25,
      backgroundColor: '#F2F4F6',
      top: 90,
      width: 300,
      height: 40,
    },
    segmentedControlItem: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
    },
    segmentedControlItemSelected: {
      backgroundColor: 'white',
      borderRadius: 30,
      // TODO: Fix this
      // margin: 2,
      height: '90%',
    },
    text: {
      color: '#000',
      fontWeight: '500',
    },
    selectedText: {
      color: '#000',
      fontWeight: '500',
    },
  });

export default createStyles;
