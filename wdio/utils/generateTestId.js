export default (Platform, id) =>
  Platform.OS === 'android'
    ? { accessible: true, accessibilityLabel: id }
    : { testID: id };
