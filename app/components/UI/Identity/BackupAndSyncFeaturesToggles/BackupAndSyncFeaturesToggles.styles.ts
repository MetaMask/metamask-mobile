import { StyleSheet } from 'react-native';
const styles = StyleSheet.create({
  setting: {
    marginTop: 0,
    paddingVertical: 16,
  },
  heading: {
    flexDirection: 'column',
    paddingBottom: 8,
  },
  settingsPageSeparator: {
    height: 1,
    opacity: 0.75,
  },
  featureView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  featureNameAndIcon: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
});

export default styles;
