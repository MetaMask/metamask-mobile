import { StyleSheet } from 'react-native';

export const defaultSlippageButtonGroupStyles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'row',
    gap: 8,
    display: 'flex',
    justifyContent: 'center',
  },
});

export const defaultSlippageModalStyles = StyleSheet.create({
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  descriptionText: {
    textAlign: 'center',
  },
  footerContainer: {
    padding: 16,
  },
});
