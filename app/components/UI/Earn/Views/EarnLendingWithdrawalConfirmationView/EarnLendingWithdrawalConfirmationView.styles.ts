import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    pageContainer: {
      backgroundColor: colors.background.alternative,
      height: '100%',
      justifyContent: 'space-between',
    },
    contentContainer: {
      paddingHorizontal: 16,
    },
    infoSections: {
      paddingTop: 16,
    },
    infoSectionContainer: {
      paddingTop: 4,
      paddingHorizontal: 8,
      paddingBottom: 8,
      gap: 16,
    },
    networkRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
};

export default styleSheet;
