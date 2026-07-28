import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingBottom: 16,
    },
    leverageDisplay: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    sliderContainer: {
      paddingHorizontal: 16,
      marginBottom: 0,
    },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 16,
    },
    quickSelectButtonWrapper: {
      flex: 1,
    },
    helpTextContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginBottom: 16,
      // Reserve space for up to two lines of HelpText so skeleton ↔ text
      // swaps (and wrap changes as the % updates) don't shift content below.
      minHeight: 40,
    },
    priceInfoContainer: {
      marginBottom: 8,
      // Reserve vertical space whether price data is available or not,
      // preventing a layout jump when switching between the two states.
      minHeight: 80,
      justifyContent: 'center',
    },
    emptyPriceInfo: {
      textAlign: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    footerButtonContainer: {
      marginBottom: 16,
    },
  });
