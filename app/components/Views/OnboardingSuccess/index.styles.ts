import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: '10%',
  },
  buttonWrapper: {
    width: '85%',
    bottom: 50,
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
    textAlign: 'center',
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
    minHeight: 50,
  },
  iconWrapper: {
    marginRight: 6,
  },
  linkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
});

export default styles;
