import { ViewStyle } from 'react-native';

const flexRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'center',
};

const pill: ViewStyle = {
  ...flexRow,
  borderRadius: 99,

  // Padding
  paddingVertical: 4,
  paddingLeft: 8,
  paddingRight: 8,

  gap: 5,
};

const sharedStyles = { pill, flexRow };

export default sharedStyles;
