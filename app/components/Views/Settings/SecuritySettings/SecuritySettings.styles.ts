import { StyleSheet } from 'react-native';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 48,
    },
    heading: {
      marginBottom: 24,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    switchElement: {
      marginLeft: 16,
    },
    blockaidSwitchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
    },
    setting: {
      marginTop: 32,
    },
    firstSetting: {
      marginTop: 0,
    },
    halfSetting: {
      marginTop: 16,
    },
    modalChildrenContainer: {
      flexDirection: 'column',
      width: '100%',
    },
    modalContentWrapper: {
      width: '100%',
    },
    modalView: {
      alignItems: 'center',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    modalText: {
      textAlign: 'center',
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 20,
    },
    protect: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    col: {
      width: '48%',
    },
    inner: {
      paddingBottom: 112,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switch: {
      alignSelf: 'flex-start',
    },
    cellBorder: { borderWidth: 0 },
    subHeading: {
      marginTop: 32,
    },
  });

export default createStyles;
