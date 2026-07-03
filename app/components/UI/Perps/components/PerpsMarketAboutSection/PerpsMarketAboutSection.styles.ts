import { StyleSheet } from 'react-native';

// Vertical rhythm between the title, description and toggle. Matches the
// spacing used by sibling market-detail cards (e.g. PerpsMarketStatisticsCard).
const SECTION_GAP = 12;

const styleSheet = () =>
  StyleSheet.create({
    container: {
      gap: SECTION_GAP,
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
