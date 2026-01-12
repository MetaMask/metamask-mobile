import { StyleSheet, Platform } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    container: {
      flex: 1,
      flexDirection: 'column',
    },
    loadingWrapper: {
      paddingHorizontal: 16,
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'flex-start',
      alignContent: 'center',
      flex: 1,
      rowGap: 24,
    },
    foxWrapper: {
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    loadingTextContainer: {
      display: 'flex',
      flexDirection: 'column',
      rowGap: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
    },
    ctaWrapper: {
      width: '100%',
      flexDirection: 'column',
      rowGap: 18,
      marginBottom: Platform.select({
        ios: 16,
        android: 24,
        default: 16,
      }),
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 8,
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 16,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 1,
      flexWrap: 'wrap',
      width: '90%',
      marginTop: -6,
    },
    headerLeft: {
      marginLeft: 16,
    },
    headerRight: {
      marginRight: 16,
    },
    passwordContainer: {
      flexDirection: 'column',
      rowGap: 16,
      flexGrow: 1,
    },
    label: {
      marginBottom: -4,
    },
    checkbox: {
      alignItems: 'flex-start',
    },
    passwordContainerTitle: {
      flexDirection: 'column',
      rowGap: 4,
    },
  });

export default createStyles;
