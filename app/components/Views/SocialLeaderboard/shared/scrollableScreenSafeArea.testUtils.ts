import { StyleSheet } from 'react-native';

/**
 * Asserts the animated header still applies the JS top inset (TSA-970) without
 * relying on native SafeAreaView top padding.
 */
export const expectHeaderIncludesTopInset = (header: {
  props: { style?: unknown };
}) => {
  const flattened = StyleSheet.flatten(header.props.style);

  expect(flattened).toEqual(
    expect.objectContaining({ marginTop: expect.any(Number) }),
  );
};
