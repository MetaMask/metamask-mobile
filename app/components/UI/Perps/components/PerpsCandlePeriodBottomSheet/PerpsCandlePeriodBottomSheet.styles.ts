import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

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
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      gap: 8,
    },
    periodOption: {
      width: '18%',
      height: 48,
      paddingVertical: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
    },
    periodOptionActive: {
      backgroundColor: colors.text.default,
      borderWidth: 1,
      borderColor: colors.text.default,
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
