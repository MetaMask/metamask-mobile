import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  statusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    width: '100%',
  },
  statusButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  description: {
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    alignSelf: 'center',
    width: '70%',
    marginHorizontal: 'auto',
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginTop: 16,
  },
  reverseCtaContainer: {
    flexDirection: 'row-reverse',
  },
});

export default styles;
