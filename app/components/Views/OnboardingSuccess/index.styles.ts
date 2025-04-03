import { StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 24,
    padding: 24,
    height: '100%',
  },
  buttonWrapper: {
    paddingHorizontal: 24,
    marginTop: 50,
    flex: 1,
  },
  emoji: {
    textAlign: 'center',
    fontSize: 65,
    marginBottom: 16,
  },
  title: {
    paddingTop: 20,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'left',
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
  descriptionBold: {
    fontSize: 14,
    textAlign: 'left',
    fontWeight: '700',
  },
  descriptionWrapper: {
    width: '90%',
  },
  button: {
    marginBottom: 16,
  },
  backButton: {
    padding: 10,
  },
  footer: {
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginVertical: 24,
    borderRadius: 8,
  },
  iconWrapper: {
    marginRight: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
  doneButton: {
    marginTop: 'auto',
    // backgroundColor: colors.primaryDefault,
  },
});

export default styles;
