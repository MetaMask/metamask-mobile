import { StyleSheet } from 'react-native';
import { MARKET_ABOUT_SECTION_GAP } from '../../constants/perpsUIConfig';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      gap: MARKET_ABOUT_SECTION_GAP,
    },
    // Off-screen measurer: laid out at the container width but visually hidden
    // and removed from the layout flow so it only reports the full line count.
    measuringText: {
      position: 'absolute',
      left: 0,
      right: 0,
      opacity: 0,
    },
    toggle: {
      textDecorationLine: 'underline',
    },
  });

export default styleSheet;
