import { StyleSheet, Platform, StatusBar } from 'react-native';
import { baseStyles } from '../../../styles/common';
import Device from '../../../util/device';
import type { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
      paddingTop:
        Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 24,
      paddingBottom: 16,
    },
    checkbox: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginRight: 25,
    },
    action: {
      flex: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    description: {
      flex: 1,
    },
    wrapper: {
      marginHorizontal: 20,
      flex: 1,
      flexDirection: 'column',
      rowGap: 16,
      paddingBottom: 80,
    },
    actionContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    button: {
      flex: 1,
    },
    title: {
      fontWeight: '700',
      marginTop: 8,
    },
    sectionContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    imageContainer: {
      alignItems: 'center',
      marginVertical: Device.isMediumDevice() ? 8 : 12,
    },
    illustration: {
      width: Device.isMediumDevice() ? 160 : 200,
      height: Device.isMediumDevice() ? 120 : 150,
      alignSelf: 'center',
    },
    flexContainer: {
      flex: 1,
    },
    descriptionText: {
      marginTop: 4,
      marginLeft: 0,
    },
    disabledContainer: {
      opacity: 0.5,
    },
  });

export default createStyles;
