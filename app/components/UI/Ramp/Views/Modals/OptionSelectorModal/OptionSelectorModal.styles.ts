import { StyleSheet } from 'react-native';

const styleSheet = (params: { vars: { screenHeight: number } }) =>
  StyleSheet.create({
    list: {
      maxHeight: params.vars.screenHeight * 0.6,
    },
  });

export default styleSheet;
