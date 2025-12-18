import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'column',
      flex: 1,
    },
    cashOutContainer: {
      flexDirection: 'column',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 2,
      gap: 8,
    },
    currentValue: {
      fontSize: 64,
      fontWeight: '500',
      lineHeight: 74,
      letterSpacing: 0,
      textAlign: 'center',
      verticalAlign: 'middle',
    },
    percentPnl: {
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    bottomContainer: {
      flexDirection: 'column',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      padding: 16,
      paddingBottom: 0,
      gap: 16,
    },
    detailsLine: {
      flexDirection: 'row',
      gap: 16,
      minWidth: 0,
    },
    detailsLeft: {
      flex: 1,
      minWidth: 0,
    },
    detailsRight: {
      flexShrink: 0,
      color: theme.colors.text.alternative,
      fontSize: 14,
      fontWeight: '500',
    },
    positionIcon: {
      width: 40,
      height: 40,
      borderRadius: 4,
    },
    cashOutButtonContainer: {
      justifyContent: 'center',
      gap: 8,
    },
    cashOutButton: {
      width: '100%',
    },
    cashOutButtonText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
