import { StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    overview: (noMargin) => ({
      marginHorizontal: noMargin ? 0 : 24,
      paddingTop: 10,
      paddingBottom: 10,
    }),
    valuesContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    gasInfoContainer: {
      paddingLeft: 2,
    },
    gasInfoIcon: (hasOrigin) => ({
      color: hasOrigin ? colors.warning.default : colors.icon.muted,
    }),
    amountContainer: {
      flex: 1,
      paddingRight: 10,
    },
    gasRowContainer: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
      marginBottom: 2,
    },
    gasBottomRowContainer: {
      marginTop: 4,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    redInfo: {
      color: colors.error.default,
    },
    timeEstimateContainer: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    flex: {
      flex: 1,
    },
  });

export default createStyles;
