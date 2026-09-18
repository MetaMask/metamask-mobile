import { StyleSheet } from 'react-native';

const styleSheet = ({ vars }: { vars: { forceBottomSheet?: boolean } }) =>
  StyleSheet.create({
    titleContainer: {
      marginTop: vars.forceBottomSheet ? 12 : 24,
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    title: {
      textAlign: 'center',
    },
    subTitle: {
      marginTop: 8,
      textAlign: 'center',
    },
  });

export default styleSheet;
