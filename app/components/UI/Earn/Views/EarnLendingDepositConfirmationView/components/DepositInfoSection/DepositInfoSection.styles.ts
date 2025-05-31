import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    infoSectionContent: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      gap: 16,
    },
    estAnnualReward: {
      flexDirection: 'row',
      gap: 8,
    },
    aprTooltipContentContainer: {
      gap: 8,
    },
  });

export default styleSheet;
