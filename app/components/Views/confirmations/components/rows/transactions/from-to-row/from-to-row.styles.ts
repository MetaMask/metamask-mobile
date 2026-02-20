import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'column',
      paddingHorizontal: 4,
    },
    row: {
      paddingVertical: 8,
    },
    rowSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.muted,
    },
    label: {
      marginBottom: 2,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
      marginLeft: -8,
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
