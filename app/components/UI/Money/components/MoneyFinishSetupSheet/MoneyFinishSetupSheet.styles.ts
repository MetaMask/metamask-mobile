import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

interface MoneyFinishSetupSheetStyles {
  content: ViewStyle;
  taskRow: ViewStyle;
  taskRowTopAligned: ViewStyle;
  taskIconContainer: ViewStyle;
  taskTextContainer: ViewStyle;
  trailingIcon: ViewStyle;
  divider: ViewStyle;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create<MoneyFinishSetupSheetStyles>({
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 20,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      minHeight: 64,
    },
    taskRowTopAligned: {
      alignItems: 'flex-start',
    },
    taskIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskTextContainer: {
      flex: 1,
      gap: 3,
    },
    trailingIcon: {
      width: 24,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 52,
      backgroundColor: theme.colors.border.muted,
    },
  });
};

export default styleSheet;
