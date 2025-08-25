import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const IMAGE_MAX_WIDTH = 343;
const IMAGE_ASPECT_RATIO = 343 / 302;
const HORIZONTAL_PADDING = 16;
const CONTAINER_WIDTH = Dimensions.get('window').width - HORIZONTAL_PADDING * 2;
const WALLET_IMAGE_WIDTH = Math.min(CONTAINER_WIDTH, IMAGE_MAX_WIDTH);

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: 0,
  },
  root: {
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 24,
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
    width: WALLET_IMAGE_WIDTH,
    height: Math.round(WALLET_IMAGE_WIDTH / IMAGE_ASPECT_RATIO),
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
    marginBottom: Platform.select({
      ios: 16,
      android: 24,
    }),
    marginTop: 'auto',
  },
});

export default styles;
