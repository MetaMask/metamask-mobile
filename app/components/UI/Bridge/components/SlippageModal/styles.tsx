import { StyleSheet } from 'react-native';

export const defaultSlippageButtonGroupStyles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'row',
    gap: 8,
    display: 'flex',
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

export const customSlippageModalStyles = StyleSheet.create({
  stepperContainer: {
    padding: 16,
  },
  keypadContainer: {
    padding: 16,
  },
  footerContainer: {
    justifyContent: 'space-around',
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  footerContainerSection: {
    flex: 1 / 2,
  },
});
