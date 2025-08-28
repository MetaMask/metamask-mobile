import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingTop: 8,
    },
    periodOptionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start', // Left-aligned rows
      paddingHorizontal: 8, // Minimal padding to prevent edge overflow
    },
    periodOption: {
      width: '18%', // Responsive width - 5 buttons fit with spacing
      height: 48, // Fixed height from Figma
      paddingVertical: 4,
      paddingHorizontal: 4, // Minimal horizontal padding
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      marginRight: '2%', // Consistent spacing between buttons
      borderRadius: 12, // From Figma
      backgroundColor: colors.background.muted, // Surface-1 equivalent
    },
    periodOptionActive: {
      backgroundColor: colors.primary.alternative,
    },
    sectionTitle: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
    },
    sectionSpacing: {
      marginTop: 16,
    },
  });
};

export default styleSheet;
