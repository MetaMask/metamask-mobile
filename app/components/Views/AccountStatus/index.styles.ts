import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: 0,
  },
  root: {
    height: '100%',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingBottom: 24,
  },
  walletReadyImage: {
    marginHorizontal: 'auto',
    alignSelf: 'center',
    marginVertical: 16,
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
  buttonContainer: {
    flexDirection: 'column',
    display: 'flex',
    rowGap: 16,
    marginBottom: 16,
    marginTop: 'auto',
  },
});

export default styles;
