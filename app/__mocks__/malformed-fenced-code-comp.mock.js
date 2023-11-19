/* eslint-disable no-console */
/* eslint-disable arrow-body-style */
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  console.log('Hello, from inside Flask fence');
  ///: ENDED:ONLY_INCLUDE_IN
  console.log('Goodbye, from outside Flask fence');
  return (
    <View>
      <Text>Hello from outside Flask fence!</Text>
    </View>
  );
};

export default MockComponent;
