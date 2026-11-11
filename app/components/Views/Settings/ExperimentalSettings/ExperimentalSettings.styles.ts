import { StyleSheet } from 'react-native';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 16,
      paddingBottom: 48,
    },
    heading: {
      marginTop: 24,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    switch: {
      alignSelf: 'flex-end',
    },
  });

export default createStyles;
