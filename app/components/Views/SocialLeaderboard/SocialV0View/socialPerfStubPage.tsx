import React from 'react';
import { View } from 'react-native';

const STUB_ROW_COUNT = 40;

/**
 * Stand-in page body for the Follow Trading mount measurement.
 * Empty rows only: the production lists, queries, and animations are heavier.
 */
const SocialPerfStubPage = () => (
  <View>
    {Array.from({ length: STUB_ROW_COUNT }, (_, index) => (
      <View key={index} />
    ))}
  </View>
);

export default SocialPerfStubPage;
