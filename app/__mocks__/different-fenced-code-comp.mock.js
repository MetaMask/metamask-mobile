/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  ///: BEGIN:ONLY_INCLUDE_IN(flask)
  console.log('Hello from inside Flask fence');
  ///: END:ONLY_INCLUDE_IN
  console.log('Goodbye, from outside Flask and Snaps fence');
  return (
    <View>
      <Text>Hello from outside Flask and Snaps fence!</Text>
      {
        ///: BEGIN:ONLY_INCLUDE_IN(snaps)
      }
      <Text>I am Snaps!</Text>
      {
        ///: END:ONLY_INCLUDE_IN
      }
    </View>
  );
};

export default MockComponent;
