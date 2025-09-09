import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flexDirection: 'column',
      gap: 1,
      paddingVertical: 8,
      width: '100%',
    },
    pillContainerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.section,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    pillContainerBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.section,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    pillContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.section,
      borderRadius: 12,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleText: {},
    valueText: {
      marginRight: 8,
      fontWeight: 500,
    },
    pnlValueText: {
      fontWeight: 500,
    },
    infoIcon: {
      marginLeft: 4,
    },
    // Deprecated - kept for backward compatibility
    balanceContainer: {
      flex: 1,
    },
    balanceText: {
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'row',
      gap: 24,
    },
    balanceSection: {
      flex: 1,
    },
    pnlSection: {
      flex: 1,
    },
    arrowContainer: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;
