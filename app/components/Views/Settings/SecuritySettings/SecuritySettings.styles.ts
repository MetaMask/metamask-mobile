import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const createStyles = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: 16,
      paddingBottom: 48,
    },
    heading: {
      marginBottom: 16,
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
      marginTop: 24,
    },
    firstSetting: {
      marginTop: 0,
    },
    halfSetting: {
      marginTop: 24,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
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
      paddingHorizontal: 16,
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
    subHeading: {
      marginTop: 40,
      marginHorizontal: -16,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingTop: 36,
    },
  });

export default createStyles;
