import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    textContent: { paddingHorizontal: 16 },
    designSystemEvalsHit: { marginRight: 8 },
    designSystemEvalsOk: { marginRight: 8 }, // ds-exception: test
  });

export default createStyles;
