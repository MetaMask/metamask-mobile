import { colors } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
const styles = StyleSheet.create({
  setting: {
    marginTop: 8,
    paddingTop: 16,
    borderTopColor: colors.dark.border.muted,
    borderTopWidth: 1,
  },
  heading: {
    flexDirection: 'column',
    paddingBottom: 8,
  },
  featureView: {
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureNameAndIcon: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
});

export default styles;
