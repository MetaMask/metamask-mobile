import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: 0,
  },
  root: {
    height: '100%',
    padding: 24,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    rowGap: 16,
    paddingBottom: 24,
  },
  walletReadyImage: {
    marginHorizontal: 'auto',
    marginVertical: 20,
    alignSelf: 'center',
    width: 340,
    height: 286,
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
  secondaryButton: {
    marginTop: 16,
  },
});

export default styles;
