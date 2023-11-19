/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import React from 'react';
import { View, Text } from 'react-native';

const MockComponent = () => {
  console.log('Goodbye, from outside Flask fence');
  return (
    <View>
      <Text>Hello from outside Flask fence!</Text>
      {
      }
    </View>
  );
};

export default MockComponent;
