import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowContainer: {
    paddingLeft: 11,
    paddingTop: 1,
    paddingBottom: 10,
  },
  transactionContainer: {
    paddingLeft: 8,
  },
  transactionAssetsContainer: {
    paddingVertical: 16,
  },
  blockExplorerButton: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 12,
  },
  textTransform: {
    textTransform: 'capitalize',
  },
});
