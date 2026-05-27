import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'column',
      paddingHorizontal: 8,
    },
    row: {
      paddingBottom: 12,
    },
    rowSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.muted,
      paddingTop: 12,
      paddingBottom: 8,
    },
    label: {
      paddingBottom: 4,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: -8,
    },
    poisonedBadge: {
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addressContent: {
      flex: 1,
    },
    skeletonBorderRadiusLarge: {
      borderRadius: 18,
    },
    skeletonBorderRadiusSmall: {
      borderRadius: 4,
    },
  });
};

export default styleSheet;
