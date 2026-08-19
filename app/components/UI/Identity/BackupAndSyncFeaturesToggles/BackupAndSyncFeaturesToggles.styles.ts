import { colors } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
const styles = StyleSheet.create({
  setting: {
    marginTop: 24,
  },
  heading: {
    flexDirection: 'column',
    paddingBottom: 8,
  },
  featureView: {
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureNameAndIcon: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
});

export default styles;
