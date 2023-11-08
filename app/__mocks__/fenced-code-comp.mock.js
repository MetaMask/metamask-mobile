
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  console.log("Hello from outside Flask fence");
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  console.log("I am Flask.");
  ///: END:ONLY_INCLUDE_IN
  console.log("Goodbye, from outside Flask fence");
  return (
    <View>
      <Text>Hello from outside Flask fence!</Text>
      {
        ///: BEGIN:ONLY_INCLUDE_IN(flask)
      }
      <Text>I am Flask!</Text>
      {
        ///: END:ONLY_INCLUDE_IN
      }
    </View>
  );
};

export default MockComponent;
