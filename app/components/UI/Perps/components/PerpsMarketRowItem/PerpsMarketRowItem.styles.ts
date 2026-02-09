import { StyleSheet } from 'react-native';

const styleSheet = (params: {
  vars: {
    compact?: boolean;
    verticalPadding?: number;
    rowHeight?: number;
    isCompact?: boolean;
  };
}) => {
  const isCompact = params.vars.isCompact ?? params.vars.compact ?? false;
  const verticalPadding = params.vars.verticalPadding ?? (isCompact ? 8 : 16);
  const rowHeight = params.vars.rowHeight;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: verticalPadding,
      ...(rowHeight !== undefined && { height: rowHeight }),
    },
    perpIcon: {
      marginRight: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    secondRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: isCompact ? 0 : 2,
    },
    rightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    priceInfo: {
      alignItems: 'flex-end',
    },
    price: {
      marginBottom: isCompact ? 0 : 2,
    },
    priceChange: {
      marginTop: isCompact ? 0 : 2,
    },
  });
};

export default styleSheet;
