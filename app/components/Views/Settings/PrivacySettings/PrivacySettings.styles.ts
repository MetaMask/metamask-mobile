import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    inner: {
      paddingHorizontal: 16,
    },
    heading: {
      marginBottom: 8,
    },
    subHeading: {
      marginTop: 24,
      marginBottom: 8,
    },
    setting: {
      marginTop: 16,
    },
    firstSetting: {
      marginTop: 0,
    },
    halfSetting: {
      marginTop: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    modalView: {
      paddingHorizontal: 24,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    modalText: {
      textAlign: 'center',
      paddingBottom: 8,
    },
    switch: {
      alignSelf: 'flex-start',
    },
  });
};

export default createStyles;
