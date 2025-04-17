import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
    padding: 24,
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 100,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    rowGap: 16,
  },
  walletReadyImage: {
    marginHorizontal: 'auto',
    marginVertical: 20,
    alignSelf: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  descriptionWrapper: {
    width: '100%',
    flexDirection: 'column',
    rowGap: 20,
  },
});

export default styles;
