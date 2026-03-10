import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollView: {
      flex: 1,
    },
    fixedFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    footerButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
    sectionContent: {
      paddingHorizontal: 16,
    },
    positionsOrdersContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
      backgroundColor: colors.background.section,
    },
  });
};

export default styleSheet;
