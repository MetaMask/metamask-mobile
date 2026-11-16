import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroContainer: {
    width: '100%',
    aspectRatio: 361 / 203,
    borderRadius: 16,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  eyebrow: {
    marginTop: 24,
  },
  title: {
    marginTop: 12,
  },
  body: {
    marginTop: 16,
  },
  benefits: {
    marginTop: 24,
  },
  benefitText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  faqTitle: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  apy: {
    textDecorationLine: 'underline',
  },
});
