/* eslint-disable arrow-body-style */
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  ///: ENDED:ONLY_INCLUDE_IN
  return (
    <View>
      <Text>Hello from outside Flask fence!</Text>
    </View>
  );
};

export default MockComponent;
