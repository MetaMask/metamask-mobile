
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  ///: END:ONLY_INCLUDE_IN
  return (
    <View>
      {
        ///: BEGIN:ONLY_INCLUDE_IN(flask)
      }
      console.log("I am Flask.");
      {
        ///: ENDED:ONLY_INCLUDE_OUT
      }
      <Text>Hello from outside Flask fence!</Text>
    </View>
  );
};

export default MockComponent;
